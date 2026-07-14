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
// SRT cue boundaries, we cut on sentence structure so each segment is a
// meaningful, self-contained chunk. A sentence is the base unit; a long
// sentence is only split where the speaker would naturally pause - after pause
// punctuation (comma / semicolon / colon / dash) or across a real silence gap
// in the audio - never mid-phrase. So we keep a sentence's important parts
// intact even if that leaves a long segment: integrity beats brevity. A
// sentence with no internal pause stays whole no matter how long it is. Because
// cuts can land mid-cue, each word carries a time interpolated within its cue,
// and a segment's start/end come from its first/last word - so playback still
// seeks close to the right spot even though the cut ignores cue boundaries.
//
//   cues ─▶ interpolate per-word time ─▶ split into sentences
//        ─▶ split long sentences at pause points ─▶ segments
const MAX_SEGMENT_WORDS = 15 // try to split any sentence longer than this...
const MIN_SPLIT_SIDE_WORDS = 2 // ...but keep each side of a cut at least this big
const PAUSE_GAP_MS = 400 // a silence this long counts as a natural break point

// Safety valve for degenerate transcripts (e.g. punctuation stripped, contiguous
// cues): a run this long with NO pause anywhere is not a real sentence to keep
// intact, and it would blow past the segment text length limit. Only then do we
// fall back to forced cuts. Real long sentences stay well under these.
const HARD_MAX_WORDS = 80
const HARD_MAX_CHARS = 700

// Pause punctuation that marks a natural place to break a long sentence: comma,
// semicolon, colon, or an en/em dash (also `--` or a lone `-` used as a dash).
// A period never appears here - sentences are already split on `.` / `!` / `?`.
const PAUSE_PUNCTUATION = /[,;:—–]$|--$|^-$/

interface TimedWord {
  text: string
  startMs: number | null
  endMs: number | null
  cueIndex: number | null
}

function dedupeFlags(flags: DictationSegmentQualityFlag[]) {
  return [...new Set(flags)]
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

/**
 * How natural a break BEFORE `next` (preceded by `previous`) is. Only real
 * pauses qualify, so a long clause never gets chopped mid-phrase:
 *   2 - `previous` ends with pause punctuation (comma / dash / ...)
 *   1 - a real silence gap (both words timed, gap >= PAUSE_GAP_MS)
 *   0 - not a pause; never a valid cut.
 */
function breakPriority(previous: TimedWord, next: TimedWord) {
  if (PAUSE_PUNCTUATION.test(previous.text)) return 2

  if (
    previous.endMs !== null &&
    next.startMs !== null &&
    next.startMs - previous.endMs >= PAUSE_GAP_MS
  )
    return 1

  return 0
}

/**
 * Pick the index to split a too-long word span, or -1 to keep it whole. Only
 * pause boundaries are candidates; among them the strongest wins, and ties
 * break toward the middle for balance. Punctuation beats a silence gap. Both
 * sides must keep >= MIN_SPLIT_SIDE_WORDS, otherwise the span stays whole - we
 * would rather have one long, intact segment than a chopped phrase.
 */
function findBestSplit(words: TimedWord[]) {
  const middle = words.length / 2
  let bestIndex = -1
  let bestPriority = 0
  let bestDistance = Infinity

  for (let index = 1; index < words.length; index += 1) {
    if (
      index < MIN_SPLIT_SIDE_WORDS ||
      words.length - index < MIN_SPLIT_SIDE_WORDS
    )
      continue

    const priority = breakPriority(words[index - 1], words[index])

    if (priority === 0) continue

    const distance = Math.abs(middle - index)

    if (
      priority > bestPriority ||
      (priority === bestPriority && distance < bestDistance)
    ) {
      bestPriority = priority
      bestDistance = distance
      bestIndex = index
    }
  }

  return bestIndex
}

/** A run so long, with no pause at all, that it must be a broken transcript. */
function exceedsHardLimit(words: TimedWord[]) {
  if (words.length > HARD_MAX_WORDS) return true

  const chars = words.reduce((sum, word) => sum + word.text.length + 1, -1)

  return chars > HARD_MAX_CHARS
}

/**
 * Last-resort split point for a degenerate run with no pause: prefer the widest
 * silence gap, else fall back to the word nearest the middle. Both sides keep
 * >= MIN_SPLIT_SIDE_WORDS.
 */
function findForcedSplit(words: TimedWord[]) {
  const middle = words.length / 2
  let bestIndex = -1
  let bestGap = -1
  let bestDistance = Infinity

  for (
    let index = MIN_SPLIT_SIDE_WORDS;
    index <= words.length - MIN_SPLIT_SIDE_WORDS;
    index += 1
  ) {
    const previous = words[index - 1]
    const next = words[index]
    const gap =
      previous.endMs !== null && next.startMs !== null
        ? Math.max(0, next.startMs - previous.endMs)
        : 0
    const distance = Math.abs(middle - index)

    if (gap > bestGap || (gap === bestGap && distance < bestDistance)) {
      bestGap = gap
      bestDistance = distance
      bestIndex = index
    }
  }

  return bestIndex
}

/** Chop a degenerate (pause-less, over-long) run down to <= MAX_SEGMENT_WORDS. */
function forceSplitSpan(words: TimedWord[], out: TimedWord[][]) {
  if (words.length <= MAX_SEGMENT_WORDS) {
    out.push(words)
    return
  }

  const splitIndex = findForcedSplit(words)

  if (splitIndex <= 0) {
    out.push(words)
    return
  }

  forceSplitSpan(words.slice(0, splitIndex), out)
  forceSplitSpan(words.slice(splitIndex), out)
}

/** Recursively split a sentence's words into chunks of <= MAX_SEGMENT_WORDS. */
function splitSentenceWords(words: TimedWord[], out: TimedWord[][]) {
  if (words.length <= MAX_SEGMENT_WORDS) {
    out.push(words)
    return
  }

  const splitIndex = findBestSplit(words)

  if (splitIndex > 0) {
    splitSentenceWords(words.slice(0, splitIndex), out)
    splitSentenceWords(words.slice(splitIndex), out)
    return
  }

  // No natural pause. Keep a long-but-reasonable sentence intact - integrity
  // beats brevity. Only a degenerate, pause-less run gets forcibly chopped so
  // it stays usable and within the stored-text length limit.
  if (exceedsHardLimit(words)) forceSplitSpan(words, out)
  else out.push(words)
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
