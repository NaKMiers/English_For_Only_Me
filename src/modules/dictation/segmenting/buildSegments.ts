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

const LARGE_GAP_MS = 3500

// Pause-based grouping. Instead of merging cues up to a sentence boundary, we
// cut the segment at natural pauses in speech (a long-enough silence between
// consecutive cues), and force a cut when a group hits a hard duration/word cap
// so a run-on passage (a speaker who never pauses) stays bite-sized. Cuts land
// on cue boundaries, so segment start/end timing stays exact for seek/replay.
// Thresholds are tunable here.
//
//   cue  cue │pause│ cue cue cue │cap│ cue …
//   └── segment ┘   └── segment ┘   (│ = a cut point)
const PAUSE_GAP_MS = 450 // silence before a cue that marks a natural break
const MAX_SEGMENT_MS = 9000 // hard cap: force a cut past this even without a pause
const MAX_SEGMENT_WORDS = 14 // hard cap on words (also covers untimed cues)
const MIN_SEGMENT_MS = 1200 // do not pause-split a group shorter than this...
const MIN_SEGMENT_WORDS = 4 // ...unless it already has at least this many words

interface CueGroup {
  cues: DictationCueRecord[]
  flags: DictationSegmentQualityFlag[]
}

function dedupeFlags(flags: DictationSegmentQualityFlag[]) {
  return [...new Set(flags)]
}

function isTimedCue(cue: DictationCueRecord) {
  return cue.startMs !== null && cue.endMs !== null
}

function hasOverlappingCue(cues: DictationCueRecord[]) {
  return cues.some((cue, index) => {
    const previousCue = cues[index - 1]

    if (!previousCue) return false
    if (!isTimedCue(cue) || !isTimedCue(previousCue)) return false

    return cue.startMs !== null && previousCue.endMs !== null
      ? cue.startMs < previousCue.endMs
      : false
  })
}

function hasLargeGap(cues: DictationCueRecord[]) {
  return cues.some((cue, index) => {
    const previousCue = cues[index - 1]

    if (!previousCue) return false
    if (!isTimedCue(cue) || !isTimedCue(previousCue)) return false

    return cue.startMs !== null && previousCue.endMs !== null
      ? cue.startMs - previousCue.endMs > LARGE_GAP_MS
      : false
  })
}

function getWordCount(value: string) {
  return value.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)?.length ?? 0
}

function getCueGroupText(cues: DictationCueRecord[]) {
  return normalizeSegmentText(cues.map(cue => cue.text).join(' '))
}

/** Silence (ms) between the previous cue's end and this cue's start; null when
 *  either side is untimed (so pause detection cannot apply). */
function gapBeforeMs(previousCue: DictationCueRecord, cue: DictationCueRecord) {
  if (!isTimedCue(previousCue) || cue.startMs === null) return null

  return cue.startMs - (previousCue.endMs as number)
}

/** Wall-clock span of a cue group; null when the first start / last end is
 *  missing, in which case only the word cap applies. */
function groupDurationMs(cues: DictationCueRecord[]) {
  const startMs = cues[0]?.startMs ?? null
  const endMs = cues.at(-1)?.endMs ?? null

  if (startMs === null || endMs === null) return null

  return endMs - startMs
}

/** A group big enough that splitting it at a pause won't make a tiny fragment. */
function groupMeetsMin(cues: DictationCueRecord[]) {
  if (getWordCount(getCueGroupText(cues)) >= MIN_SEGMENT_WORDS) return true

  const durationMs = groupDurationMs(cues)

  return durationMs !== null && durationMs >= MIN_SEGMENT_MS
}

/** A group at/over the hard ceiling; force a cut so run-ons stay bite-sized. */
function groupOverCap(cues: DictationCueRecord[]) {
  if (getWordCount(getCueGroupText(cues)) >= MAX_SEGMENT_WORDS) return true

  const durationMs = groupDurationMs(cues)

  return durationMs !== null && durationMs >= MAX_SEGMENT_MS
}

// Close the current group when there's a real pause before the next cue (and
// the group already meets the minimum), or force-close when it hits the cap.
function groupTimedCues(cues: DictationCueRecord[]) {
  const groups: CueGroup[] = []
  let currentGroup: DictationCueRecord[] = []

  for (const rawCue of cues) {
    const text = normalizeSegmentText(rawCue.text)

    if (!text) continue

    const cue = { ...rawCue, text }
    const previousCue = currentGroup.at(-1)

    if (previousCue) {
      const gap = gapBeforeMs(previousCue, cue)

      if (gap !== null && gap >= PAUSE_GAP_MS && groupMeetsMin(currentGroup)) {
        groups.push({ cues: currentGroup, flags: [] })
        currentGroup = []
      }
    }

    currentGroup.push(cue)

    if (groupOverCap(currentGroup)) {
      groups.push({ cues: currentGroup, flags: [] })
      currentGroup = []
    }
  }

  if (currentGroup.length > 0)
    groups.push({ cues: currentGroup, flags: [] })

  return groups
}

function createSegmentFromCueGroup(group: CueGroup, order: number) {
  const text = getCueGroupText(group.cues)
  const timedCues = group.cues.filter(isTimedCue)
  const allCuesTimed = timedCues.length === group.cues.length
  const noCuesTimed = timedCues.length === 0
  const timingFlags: DictationSegmentQualityFlag[] = []

  if (noCuesTimed) timingFlags.push('untimed')
  else if (!allCuesTimed) timingFlags.push('partialTiming')

  if (hasOverlappingCue(group.cues)) timingFlags.push('overlappingTiming')
  if (hasLargeGap(group.cues)) timingFlags.push('largeGap')

  return {
    cueIndexes: group.cues.map(cue => cue.index),
    endMs: allCuesTimed ? (group.cues.at(-1)?.endMs ?? null) : null,
    normalizedText: normalizeSegmentComparisonText(text),
    order,
    qualityFlags: dedupeFlags([
      // Pause-based segments legitimately end mid-sentence at a natural pause,
      // so drop 'missingPunctuation' here (it would flag nearly every segment).
      ...getTextQualityFlags(text).filter(
        flag => flag !== 'missingPunctuation'
      ),
      ...timingFlags,
      ...group.flags,
    ]),
    startMs: allCuesTimed ? (group.cues[0]?.startMs ?? null) : null,
    text,
    warningAccepted: false,
  } satisfies SegmentDraft
}

function createUntimedSegments(rawText: string) {
  return splitTextIntoSentences(rawText).map((sentence, index) => {
    const text = normalizeSegmentText(sentence)

    return {
      cueIndexes: [],
      endMs: null,
      normalizedText: normalizeSegmentComparisonText(text),
      order: index,
      qualityFlags: dedupeFlags([...getTextQualityFlags(text), 'untimed']),
      startMs: null,
      text,
      warningAccepted: false,
    } satisfies SegmentDraft
  })
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
  const segments =
    rawCues.length > 0
      ? groupTimedCues(rawCues).map((group, index) =>
          createSegmentFromCueGroup(group, index)
        )
      : createUntimedSegments(rawText)
  const flaggedSegments = flagDuplicateText(segments).map((segment, index) => ({
    ...segment,
    order: index,
  }))
  const qualityFlags = summarizeQualityFlags(flaggedSegments)

  return {
    qualityFlags,
    qualityStatus: getQualityStatus(flaggedSegments),
    segments: flaggedSegments,
  }
}
