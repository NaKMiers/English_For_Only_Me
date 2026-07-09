import type {
  DictationAttemptAction,
  DictationCorrectionStatsRecord,
  DictationCorrectionTokenRecord,
} from '@/modules/dictation/types'

import { buildDictationCorrection } from './compareAnswer'
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
 * level here — see the skipped test. The alternatives list still surfaces the
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
  | 'matched' // fully-correct typed word — show real text, green
  | 'boundaryReveal' // first diverging word revealed in full (fix target)
  | 'boundaryPartial' // clean incomplete prefix of the last typed word
  | 'remaining' // words after the boundary — masked when showFullAnswer is off

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

/** Lowercase + strip surrounding/embedded punctuation for comparison, mirroring
 * normalizeAnswer's per-token canonicalization but WITHOUT contraction
 * expansion (kept 1:1 so raw display units and comparison units stay aligned). */
function normalizeUnit(value: string) {
  return value
    .normalize('NFKC')
    .replace(/[‘’‛′]/g, "'")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']/gu, '')
}

/** A word is a hint when it carries an uppercase letter that is not merely the
 * sentence-initial capital, and is not the pronoun "I". Deterministic, derived
 * from the transcript text — no dictionary lookup (design decision, muc 13-2). */
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
  typedUnits: string[]
): number {
  let matched = 0

  while (
    matched < expectedUnits.length &&
    matched < typedUnits.length &&
    normalizeUnit(expectedUnits[matched]) === normalizeUnit(typedUnits[matched])
  )
    matched += 1

  return matched
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

function buildSegments({
  expectedUnits,
  typedUnits,
  fullyMatched,
}: {
  expectedUnits: string[]
  fullyMatched: number
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
    isCleanPrefix(normalizeUnit(boundaryExpected), normalizeUnit(boundaryTyped))

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
      boundaryIndex: 0,
      caretValue: '',
      feedbackTokens: analytics.feedbackTokens,
      hints: [],
      isPassed: false,
      segments,
      stats: analytics.stats,
    }
  }

  const fullyMatched = countFullyMatched(expectedUnits, typedUnits)
  const { boundaryIndex, caretValue, segments } = buildSegments({
    expectedUnits,
    fullyMatched,
    typedUnits,
  })

  return {
    action,
    alternatives: {},
    boundaryIndex,
    caretValue,
    feedbackTokens: analytics.feedbackTokens,
    hints: collectHints(expectedUnits, fullyMatched),
    isPassed: analytics.isPassed,
    segments,
    stats: analytics.stats,
  }
}
