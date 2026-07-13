import type {
  DictationCueRecord,
  DictationSegmentQualityFlag,
} from '@/modules/dictation/types'

import {
  getTextQualityFlags,
  normalizeSegmentComparisonText,
  normalizeSegmentText,
  splitTextIntoSentences,
} from './text'
import type {
  BuildSegmentsInput,
  BuildSegmentsResult,
  SegmentDraft,
} from './types'

// Grammar-based segmentation (DailyDictation style). Instead of following the
// SRT cue boundaries, we cut on sentence + clause structure so each segment is
// a bite-sized, meaningful chunk. A sentence is the base unit; a long sentence
// is split at the best clause boundary (comma > coordinating conjunction >
// subordinator / preposition / participle) nearest its middle, recursively,
// until every chunk fits MAX_SEGMENT_WORDS. Because cuts can land mid-cue, each
// word carries a time interpolated within its cue, and a segment's start/end
// come from its first/last word - so playback still seeks close to the right
// spot even though the cut ignores cue boundaries.
//
//   cues ─▶ interpolate per-word time ─▶ split into sentences
//        ─▶ split long sentences at clause boundaries ─▶ segments
const MAX_SEGMENT_WORDS = 15 // split any sentence/chunk longer than this
const MIN_SEGMENT_WORDS = 4 // avoid tiny chunks except at a comma boundary
const BOUNDARY_WEIGHT = 3 // how far a good boundary may pull the cut off-center

// Words that usually start a new clause - good places to break a long sentence.
const COORDINATORS = new Set(['and', 'but', 'or', 'so', 'nor', 'yet'])
const SUBORDINATORS = new Set([
  'that', 'which', 'who', 'whom', 'whose', 'when', 'where', 'while', 'because',
  'if', 'as', 'to', 'although', 'though', 'since', 'until', 'before', 'after',
  'however', 'whereas', 'unless',
])
const PREPOSITIONS = new Set([
  'of', 'in', 'on', 'for', 'with', 'into', 'across', 'through', 'at', 'by',
  'from', 'about', 'over', 'under', 'between', 'among', 'against', 'toward',
  'towards', 'onto', 'upon',
])

interface TimedWord {
  text: string
  startMs: number | null
  endMs: number | null
  cueIndex: number | null
}

function dedupeFlags(flags: DictationSegmentQualityFlag[]) {
  return [...new Set(flags)]
}

/** Lowercased word with surrounding punctuation stripped (for boundary tests). */
function cleanWord(value: string) {
  return value.toLowerCase().replace(/^[^a-z']+/, '').replace(/[^a-z']+$/, '')
}

/** Alphanumeric-only, lowercased - used to align words back to sentences. */
function stripToAlnum(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Split a cue's text into words, giving each word a time interpolated within
 * the cue by character position (longer words take proportionally longer). The
 * last word of a timed cue ends exactly at the cue end, so cuts that happen to
 * land on a cue boundary stay exact.
 */
function cueToTimedWords(cue: DictationCueRecord): TimedWord[] {
  const words = normalizeSegmentText(cue.text).split(' ').filter(Boolean)

  if (words.length === 0) return []

  if (cue.startMs === null || cue.endMs === null || cue.endMs <= cue.startMs)
    return words.map(text => ({
      text,
      startMs: null,
      endMs: null,
      cueIndex: cue.index,
    }))

  const totalChars = words.reduce((sum, word) => sum + word.length, 0) || 1
  const durationMs = cue.endMs - cue.startMs
  let charsSoFar = 0

  return words.map(text => {
    const startMs = cue.startMs! + Math.round((charsSoFar / totalChars) * durationMs)
    charsSoFar += text.length
    const endMs = cue.startMs! + Math.round((charsSoFar / totalChars) * durationMs)

    return { text, startMs, endMs, cueIndex: cue.index }
  })
}

/** Group the word stream into sentences (reusing the abbreviation-aware splitter). */
function splitWordsIntoSentences(words: TimedWord[]): TimedWord[][] {
  if (words.length === 0) return []

  const sentences = splitTextIntoSentences(words.map(word => word.text).join(' '))
  const groups: TimedWord[][] = []
  let wordIndex = 0

  for (const sentence of sentences) {
    const target = stripToAlnum(sentence)

    if (!target) continue

    let collected = ''
    const group: TimedWord[] = []

    while (wordIndex < words.length && collected.length < target.length) {
      collected += stripToAlnum(words[wordIndex].text)
      group.push(words[wordIndex])
      wordIndex += 1
    }

    if (group.length > 0) groups.push(group)
  }

  // Any trailing words the splitter didn't account for join the last sentence.
  if (wordIndex < words.length) {
    const rest = words.slice(wordIndex)

    if (groups.length > 0) groups[groups.length - 1].push(...rest)
    else groups.push(rest)
  }

  return groups
}

/** How good a break point BEFORE `word` (preceded by `previousWord`) is. */
function boundaryPriority(previousWord: string, word: string) {
  if (/[,;:]$/.test(previousWord)) return 4

  const clean = cleanWord(word)

  if (COORDINATORS.has(clean)) return 3
  if (SUBORDINATORS.has(clean) || PREPOSITIONS.has(clean) || /ing$/.test(clean))
    return 2

  return 1
}

/**
 * Pick the index to split a too-long word span. Prefers a strong clause
 * boundary near the middle: score = priority*weight - distance-from-middle, so
 * a comma a bit off-center still beats a weak break dead-center, but balance
 * wins between equal boundaries. Comma boundaries may leave a small side; other
 * boundaries must keep both sides >= MIN_SEGMENT_WORDS.
 */
function findBestSplit(words: TimedWord[]) {
  const middle = words.length / 2
  let bestIndex = -1
  let bestScore = -Infinity

  for (let index = 1; index < words.length; index += 1) {
    const priority = boundaryPriority(words[index - 1].text, words[index].text)
    const minSide = priority >= 4 ? 2 : MIN_SEGMENT_WORDS

    if (index < minSide || words.length - index < minSide) continue

    const score = priority * BOUNDARY_WEIGHT - Math.abs(middle - index)

    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  }

  return bestIndex
}

/** Recursively split a sentence's words into chunks of <= MAX_SEGMENT_WORDS. */
function splitSentenceWords(words: TimedWord[], out: TimedWord[][]) {
  if (words.length <= MAX_SEGMENT_WORDS) {
    out.push(words)
    return
  }

  const splitIndex = findBestSplit(words)

  if (splitIndex <= 0) {
    out.push(words)
    return
  }

  splitSentenceWords(words.slice(0, splitIndex), out)
  splitSentenceWords(words.slice(splitIndex), out)
}

function createSegmentFromWords(words: TimedWord[], order: number): SegmentDraft {
  const text = normalizeSegmentText(words.map(word => word.text).join(' '))
  const timedWords = words.filter(
    word => word.startMs !== null && word.endMs !== null
  )
  const allTimed = timedWords.length === words.length
  const noneTimed = timedWords.length === 0

  const timingFlags: DictationSegmentQualityFlag[] = []

  if (noneTimed) timingFlags.push('untimed')
  else if (!allTimed) timingFlags.push('partialTiming')

  const cueIndexes = [
    ...new Set(
      words
        .map(word => word.cueIndex)
        .filter((index): index is number => index !== null)
    ),
  ]

  return {
    cueIndexes,
    endMs: allTimed ? (words.at(-1)?.endMs ?? null) : null,
    normalizedText: normalizeSegmentComparisonText(text),
    order,
    qualityFlags: dedupeFlags([
      // Clause-cut chunks legitimately end mid-sentence, so the missing-period
      // warning would fire on nearly every one - drop it here.
      ...getTextQualityFlags(text).filter(flag => flag !== 'missingPunctuation'),
      ...timingFlags,
    ]),
    startMs: allTimed ? (words[0]?.startMs ?? null) : null,
    text,
    warningAccepted: false,
  }
}

function flagDuplicateText(segments: SegmentDraft[]) {
  const seen = new Map<string, number>()

  return segments.map(segment => {
    const previousIndex = seen.get(segment.normalizedText)
    seen.set(segment.normalizedText, segment.order)

    if (previousIndex === undefined || !segment.normalizedText) return segment

    return {
      ...segment,
      qualityFlags: dedupeFlags([...segment.qualityFlags, 'duplicateText']),
    }
  })
}

function summarizeQualityFlags(segments: SegmentDraft[]) {
  return dedupeFlags(segments.flatMap(segment => segment.qualityFlags))
}

function getQualityStatus(segments: SegmentDraft[]) {
  if (segments.length === 0) return 'blocked'

  const flags = summarizeQualityFlags(segments)

  return flags.length > 0 ? 'warning' : 'ready'
}

export function buildDictationSegments({
  rawCues,
  rawText,
}: BuildSegmentsInput): BuildSegmentsResult {
  // Prefer the timed cues (they carry per-word timing). Fall back to the plain
  // rawText as a single untimed stream, which still gets sentence/clause splits.
  const words: TimedWord[] =
    rawCues.length > 0
      ? rawCues.flatMap(cueToTimedWords)
      : normalizeSegmentText(rawText)
          .split(' ')
          .filter(Boolean)
          .map(text => ({ text, startMs: null, endMs: null, cueIndex: null }))

  const chunks: TimedWord[][] = []

  for (const sentence of splitWordsIntoSentences(words))
    splitSentenceWords(sentence, chunks)

  const segments = flagDuplicateText(
    chunks.map((chunk, index) => createSegmentFromWords(chunk, index))
  ).map((segment, index) => ({ ...segment, order: index }))

  return {
    qualityFlags: summarizeQualityFlags(segments),
    qualityStatus: getQualityStatus(segments),
    segments,
  }
}
