import type {
  DictationAttemptAction,
  DictationCorrectionStatsRecord,
  DictationCorrectionTokenRecord,
} from '@/modules/dictation/types'

import { buildDictationCorrection } from './compareAnswer'
import {
  canonicalizeCorrectionToken,
  expandSymbolicVariants,
} from './normalizeAnswer'
import { DEFAULT_CORRECTION_OPTIONS, type CorrectionOptions } from './types'

/**
 * Character-level "type-along" correction engine (DailyDictation parity).
 *
 * The learner types a sentence and presses Check. Unlike the word-level
 * `buildDictationCorrection` (which grades the whole answer into chip tokens for
 * analytics), this engine produces a PRESENTATION model: reveal the words typed
 * correctly, reveal/mark the first diverging word, and leave the rest for the UI
 * to mask with `*` when "Show full answer" is off.
 *
 * Reveal model (confirmed against DailyDictation, 2026-07-09):
 *
 *   matched words          boundary word                     remaining words
 *   ┌───────────────┐      ┌──────────────────────────┐      ┌──────────────┐
 *   As years passed  ...   [nothing typed]  → reveal    ...   masked when
 *   (shown in green)       [clean prefix]   → partial+■        showFullAnswer
 *                          [wrong / typed-past] → reveal        is OFF
 *
 * The "remaining vs matched" split is a WORD-PREFIX: matching stops at the first
 * word that is not fully correct. Words the learner typed correctly *after* an
 * earlier mistake are still masked, because the learner must fix the boundary
 * first. Character-level detail (red = wrong char, yellow = missing char) is
 * computed only for the boundary word.
 *
 * Analytics (feedbackTokens + stats) are delegated to `buildDictationCorrection`
 * so persistence, videoStats, reviewScheduler, and the AI debrief keep the exact
 * word-level shape they already consume. This is the "one engine, two
 * representations" split from the eng review (F1).
 *
 * KNOWN LIMITATION (T1 follow-up): contraction equivalence that changes word
 * count (expected "he would" ⇄ typed "he'd") is not yet aligned at the word
 * level here - see the skipped test. The alternatives list still surfaces the
 * accepted forms for the UI's "You can type X or Y" line.
 */

export type CharCellStatus = 'correct' | 'missing' | 'wrong' | 'extra'

export interface CharCell {
  /** Expected character at this position, or null for an extra typed char. */
  expectedChar: string | null
  /** Character the learner typed here, or null when nothing was typed yet. */
  typedChar: string | null
  status: CharCellStatus
}

export type WordSegmentKind =
  | 'matched' // fully-correct typed word - show real text, green
  | 'boundaryReveal' // first diverging word revealed in full (fix target)
  | 'boundaryPartial' // clean incomplete prefix of the last typed word
  | 'remaining' // words after the boundary - masked when showFullAnswer is off

export interface WordSegment {
  kind: WordSegmentKind
  /** Raw expected word for this slot, including its punctuation (e.g. "grew,"). */
  expected: string
  /** The learner's raw word for this slot, or null when they did not type it. */
  typed: string | null
  /** Per-character detail. Present for boundary segments; matched/remaining use
   * a trivially-correct / not-computed cell list the UI can ignore. */
  chars: CharCell[]
}

/** The first not-fully-correct word located inside the RAW typed answer, so the
 * guided input can underline it in place without rewriting the draft. `start`/
 * `end` are code-unit offsets into `typedValue`; `wrongOffsets` are the absolute
 * offsets of the substituted/extra characters the learner typed (red), while the
 * whole [start, end) span is the wrong word (amber). */
export interface CharBoundary {
  start: number
  end: number
  wrongOffsets: number[]
}

export interface CharCorrectionResult {
  action: DictationAttemptAction
  isPassed: boolean
  /** Ordered words for rendering the answer line. */
  segments: WordSegment[]
  /** Index of the first not-fully-correct word (the boundary). */
  boundaryIndex: number
  /**
   * Where the caret belongs, expressed as the string the input should contain up
   * to the caret: matched words plus the learner's partial/wrong boundary text.
   * T2 (the guided input) turns this into a DOM caret position.
   */
  caretValue: string
  /** The raw typed answer this correction was computed from. The guided input
   * compares it against the live draft to know the correction is still fresh. */
  typedValue: string
  /** Caret position (code-unit offset into `typedValue`) after a wrong Check:
   * just past the boundary word, so the learner fixes it WITHOUT losing the text
   * they typed after it (DailyDictation parity). */
  caretOffset: number
  /** The boundary word's location in `typedValue`, or null when the learner has
   * not typed a word at the boundary yet (or the answer passed). */
  boundary: CharBoundary | null
  /** Proper-noun hint words not yet typed correctly (mid-sentence capitals). */
  hints: string[]
  /** Per expected word, the set of accepted spellings (for "You can type X or Y"). */
  alternatives: Record<number, string[]>
  /** Word-level analytics, delegated to buildDictationCorrection. */
  feedbackTokens: DictationCorrectionTokenRecord[]
  stats: DictationCorrectionStatsRecord
}

interface BuildCharCorrectionInput {
  action: DictationAttemptAction
  expectedText: string
  options?: CorrectionOptions
  typedAnswer: string
}

const SENTENCE_END = /[.!?…]$/

function splitUnits(value: string) {
  return value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
}

/** Code-unit [start, end) ranges of every whitespace-delimited token in the raw
 * text, in order. Indices align 1:1 with splitUnits(text), so the Nth range is
 * where the Nth unit sits in the original string (spacing preserved). */
function tokenRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = []
  const matcher = /\S+/g
  let match: RegExpExecArray | null

  while ((match = matcher.exec(text)) !== null)
    ranges.push([match.index, match.index + match[0].length])

  return ranges
}

/** Locate the boundary word inside the raw typed answer and flag the characters
 * the learner actually got wrong (substituted or typed past the expected word).
 * Character comparison is case-insensitive, matching buildCharCells. */
function locateBoundary(
  typedAnswer: string,
  expectedWord: string,
  boundaryIndex: number
): CharBoundary | null {
  const range = tokenRanges(typedAnswer)[boundaryIndex]

  if (!range) return null

  const [start, end] = range
  const typedWord = typedAnswer.slice(start, end)
  const wrongOffsets: number[] = []

  for (let position = 0; position < typedWord.length; position += 1) {
    const expectedChar =
      position < expectedWord.length ? expectedWord[position] : null

    if (
      expectedChar === null ||
      typedWord[position].toLowerCase() !== expectedChar.toLowerCase()
    )
      wrongOffsets.push(start + position)
  }

  return { end, start, wrongOffsets }
}

/** Lowercase + strip surrounding/embedded punctuation for comparison, mirroring
 * normalizeAnswer's per-token canonicalization but WITHOUT contraction
 * expansion (kept 1:1 so raw display units and comparison units stay aligned). */
function normalizeUnit(
  value: string,
  options: Required<CorrectionOptions> = DEFAULT_CORRECTION_OPTIONS
) {
  const token = value
    .normalize('NFKC')
    .replace(/[‘’‛′]/g, "'")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']/gu, '')

  return canonicalizeCorrectionToken(token, options)
}

/** A word is a hint when it carries an uppercase letter that is not merely the
 * sentence-initial capital, and is not the pronoun "I". Deterministic, derived
 * from the transcript text - no dictionary lookup (design decision, muc 13-2). */
function isProperNoun(rawWord: string, isSentenceStart: boolean) {
  const core = rawWord.replace(/[^\p{L}\p{N}']/gu, '')

  if (core.length === 0) return false
  if (core === 'I') return false

  const hasInternalCapital = /\p{Lu}/u.test(
    isSentenceStart ? core.slice(1) : core
  )

  return hasInternalCapital
}

function buildCharCells(expected: string, typed: string | null): CharCell[] {
  const cells: CharCell[] = []
  const typedChars = typed ?? ''

  for (let index = 0; index < expected.length; index += 1) {
    const expectedChar = expected[index]
    const typedChar = index < typedChars.length ? typedChars[index] : null

    if (typedChar === null) {
      cells.push({ expectedChar, typedChar: null, status: 'missing' })
      continue
    }

    const isSame = typedChar.toLowerCase() === expectedChar.toLowerCase()

    cells.push({
      expectedChar,
      typedChar,
      status: isSame ? 'correct' : 'wrong',
    })
  }

  // Extra characters the learner typed past the end of the expected word.
  for (let index = expected.length; index < typedChars.length; index += 1)
    cells.push({
      expectedChar: null,
      typedChar: typedChars[index],
      status: 'extra',
    })

  return cells
}

function countFullyMatched(
  expectedUnits: string[],
  typedUnits: string[],
  options: Required<CorrectionOptions> = DEFAULT_CORRECTION_OPTIONS
): number {
  let matched = 0

  while (
    matched < expectedUnits.length &&
    matched < typedUnits.length &&
    normalizeUnit(expectedUnits[matched], options) ===
      normalizeUnit(typedUnits[matched], options)
  )
    matched += 1

  return matched
}

/** A token that is pure punctuation (normalises to nothing), e.g. a standalone
 * "–", "—" or ":" that the expected text carries between words. */
function isPunctuationOnlyUnit(unit: string) {
  return normalizeUnit(unit) === ''
}

/** Rewrite the learner's draft toward the canonical answer on Check: the words
 * they got right (ignoring case, punctuation, and extra whitespace) are replaced
 * with the expected spelling + punctuation, and standalone punctuation tokens the
 * expected text carries (e.g. a lone "–") are auto-inserted.
 *
 * When the learner has typed a clean prefix (no wrong word), the correction also
 * looks AHEAD: it fills any punctuation that immediately follows the last matched
 * word, then leaves a trailing space if more words are still to come — so the
 * caret is parked right where the next word goes. A genuinely wrong word stops
 * all of that; everything from there on is kept as typed (whitespace-collapsed)
 * so the learner can fix the boundary. Pure — exported for tests. */
export function autoCorrectAnswer(
  expectedText: string,
  typedAnswer: string,
  optionsInput: CorrectionOptions = {}
): string {
  const options = { ...DEFAULT_CORRECTION_OPTIONS, ...optionsInput }
  const expectedUnits = splitUnits(expectedText)
  const typedUnits = splitUnits(expandSymbolicVariants(typedAnswer))
  const canonical: string[] = []
  let expectedIndex = 0
  let typedIndex = 0
  let matchedCleanly = true

  while (typedIndex < typedUnits.length) {
    // Carry standalone punctuation tokens ("–", "—", ":") in canonical form. If
    // the learner also typed a punctuation token here, consume it too — otherwise
    // their "–" would survive alongside the inserted one and duplicate on each
    // Check.
    while (
      expectedIndex < expectedUnits.length &&
      isPunctuationOnlyUnit(expectedUnits[expectedIndex])
    ) {
      canonical.push(expectedUnits[expectedIndex])
      expectedIndex += 1

      if (
        typedIndex < typedUnits.length &&
        isPunctuationOnlyUnit(typedUnits[typedIndex])
      )
        typedIndex += 1
    }

    if (typedIndex >= typedUnits.length) break

    if (expectedIndex >= expectedUnits.length) {
      matchedCleanly = false
      break
    }

    if (
      normalizeUnit(typedUnits[typedIndex], options) ===
      normalizeUnit(expectedUnits[expectedIndex], options)
    ) {
      canonical.push(expectedUnits[expectedIndex])
      expectedIndex += 1
      typedIndex += 1
    } else {
      matchedCleanly = false
      break
    }
  }

  // A wrong/extra word (or an empty draft): keep whatever the learner typed from
  // the boundary on, without volunteering the upcoming answer.
  if (!matchedCleanly || typedIndex === 0)
    return [...canonical, ...typedUnits.slice(typedIndex)].join(' ')

  // Clean prefix: fill the punctuation that follows the last matched word...
  while (
    expectedIndex < expectedUnits.length &&
    isPunctuationOnlyUnit(expectedUnits[expectedIndex])
  ) {
    canonical.push(expectedUnits[expectedIndex])
    expectedIndex += 1
  }

  const result = canonical.join(' ')

  // ...then park a trailing space when more words are still to come.
  return expectedIndex < expectedUnits.length ? `${result} ` : result
}

function isCleanPrefix(expectedNorm: string, typedNorm: string) {
  return (
    typedNorm.length > 0 &&
    typedNorm.length < expectedNorm.length &&
    expectedNorm.startsWith(typedNorm)
  )
}

function collectHints(expectedUnits: string[], fromIndex: number): string[] {
  const hints: string[] = []
  let sentenceStart = true

  expectedUnits.forEach((unit, index) => {
    if (index >= fromIndex && isProperNoun(unit, sentenceStart))
      hints.push(unit.replace(/[^\p{L}\p{N}']/gu, ''))

    sentenceStart = SENTENCE_END.test(unit)
  })

  return hints
}

/** Proper-noun hints for the sentence, live from the current draft - no Check
 * required. Cheap subset of buildCharCorrection (skips segments/analytics) so
 * the UI can recompute it on every keystroke. */
export function computeHints(
  expectedText: string,
  typedAnswer: string
): string[] {
  const expectedUnits = splitUnits(expectedText)
  const typedUnits = splitUnits(typedAnswer)
  const fullyMatched = countFullyMatched(expectedUnits, typedUnits)

  return collectHints(expectedUnits, fullyMatched)
}

function buildSegments({
  expectedUnits,
  typedUnits,
  fullyMatched,
  options,
}: {
  expectedUnits: string[]
  fullyMatched: number
  options: Required<CorrectionOptions>
  typedUnits: string[]
}): { segments: WordSegment[]; boundaryIndex: number; caretValue: string } {
  const segments: WordSegment[] = []

  for (let index = 0; index < fullyMatched; index += 1)
    segments.push({
      kind: 'matched',
      expected: expectedUnits[index],
      typed: typedUnits[index],
      chars: buildCharCells(expectedUnits[index], typedUnits[index]),
    })

  const boundaryIndex = fullyMatched
  const matchedCaret = expectedUnits.slice(0, fullyMatched).join(' ')

  if (boundaryIndex >= expectedUnits.length)
    return {
      boundaryIndex,
      caretValue: matchedCaret,
      segments,
    }

  const boundaryExpected = expectedUnits[boundaryIndex]
  const boundaryTyped = typedUnits[boundaryIndex] ?? null
  const hasContentAfter = typedUnits.length > boundaryIndex + 1
  const cleanPrefix =
    boundaryTyped !== null &&
    !hasContentAfter &&
    isCleanPrefix(
      normalizeUnit(boundaryExpected, options),
      normalizeUnit(boundaryTyped, options)
    )

  let caretValue = matchedCaret

  if (boundaryTyped === null) {
    // Typed nothing here yet: reveal the next word as a hint, caret sits at the
    // start of the boundary (after the matched words + a joining space).
    segments.push({
      kind: 'boundaryReveal',
      expected: boundaryExpected,
      typed: null,
      chars: buildCharCells(boundaryExpected, null),
    })
    caretValue = fullyMatched > 0 ? `${matchedCaret} ` : ''
  } else if (cleanPrefix) {
    segments.push({
      kind: 'boundaryPartial',
      expected: boundaryExpected,
      typed: boundaryTyped,
      chars: buildCharCells(boundaryExpected, boundaryTyped),
    })
    caretValue =
      fullyMatched > 0 ? `${matchedCaret} ${boundaryTyped}` : boundaryTyped
  } else {
    segments.push({
      kind: 'boundaryReveal',
      expected: boundaryExpected,
      typed: boundaryTyped,
      chars: buildCharCells(boundaryExpected, boundaryTyped),
    })
    caretValue =
      fullyMatched > 0 ? `${matchedCaret} ${boundaryTyped}` : boundaryTyped
  }

  for (let index = boundaryIndex + 1; index < expectedUnits.length; index += 1)
    segments.push({
      kind: 'remaining',
      expected: expectedUnits[index],
      typed: typedUnits[index] ?? null,
      chars: buildCharCells(expectedUnits[index], null),
    })

  return { boundaryIndex, caretValue, segments }
}

/** Render the answer line the way the learner sees it. `showFullAnswer` off
 * masks every remaining word with `*` (spaces preserved), matching the toggle
 * behaviour in muc 8. Exposed for tests and the UI. */
export function renderAnswerLine(
  result: CharCorrectionResult,
  { showFullAnswer }: { showFullAnswer: boolean }
) {
  return result.segments
    .map(segment => {
      if (showFullAnswer || segment.kind !== 'remaining')
        return segment.expected

      return segment.expected.replace(/\S/g, '*')
    })
    .join(' ')
}

export function buildCharCorrection({
  action,
  expectedText,
  options: optionsInput = {},
  typedAnswer,
}: BuildCharCorrectionInput): CharCorrectionResult {
  const options = { ...DEFAULT_CORRECTION_OPTIONS, ...optionsInput }
  const expectedUnits = splitUnits(expectedText)
  const typedUnits = splitUnits(typedAnswer)

  // Analytics representation stays word-level and identical to the existing
  // pipeline so nothing downstream changes (eng review F1).
  const analytics = buildDictationCorrection({
    action,
    expectedText,
    options,
    typedAnswer,
  })

  if (action === 'reveal' || action === 'skip') {
    const segments: WordSegment[] = expectedUnits.map(unit => ({
      kind: 'boundaryReveal',
      expected: unit,
      typed: null,
      chars: buildCharCells(unit, null),
    }))

    return {
      action,
      alternatives: {},
      boundary: null,
      boundaryIndex: 0,
      caretOffset: typedAnswer.length,
      caretValue: '',
      feedbackTokens: analytics.feedbackTokens,
      hints: [],
      isPassed: false,
      segments,
      stats: analytics.stats,
      typedValue: typedAnswer,
    }
  }

  const fullyMatched = countFullyMatched(expectedUnits, typedUnits, options)
  const { boundaryIndex, caretValue, segments } = buildSegments({
    expectedUnits,
    fullyMatched,
    options,
    typedUnits,
  })
  // Anchor the boundary word inside the raw draft so the guided input can
  // underline it and drop the caret just past it — keeping everything the
  // learner typed after the mistake instead of truncating to the prefix.
  const boundary = locateBoundary(
    typedAnswer,
    expectedUnits[boundaryIndex] ?? '',
    boundaryIndex
  )

  return {
    action,
    alternatives: {},
    boundary,
    boundaryIndex,
    caretOffset: boundary ? boundary.end : typedAnswer.length,
    caretValue,
    feedbackTokens: analytics.feedbackTokens,
    hints: collectHints(expectedUnits, fullyMatched),
    isPassed: analytics.isPassed,
    segments,
    stats: analytics.stats,
    typedValue: typedAnswer,
  }
}
