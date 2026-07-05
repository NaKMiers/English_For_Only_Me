import type {
  DictationCueRecord,
  DictationSegmentQualityFlag,
} from '@/modules/dictation/types'

import {
  getTextQualityFlags,
  hasSentenceEnding,
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
const MAX_FRAGMENT_WORDS = 34

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

function shouldCloseCueGroup(cues: DictationCueRecord[]) {
  const text = getCueGroupText(cues)

  return hasSentenceEnding(text) || getWordCount(text) >= MAX_FRAGMENT_WORDS
}

function groupTimedCues(cues: DictationCueRecord[]) {
  const groups: CueGroup[] = []
  let currentGroup: DictationCueRecord[] = []

  for (const cue of cues) {
    const text = normalizeSegmentText(cue.text)

    if (!text) continue

    currentGroup.push({ ...cue, text })

    if (shouldCloseCueGroup(currentGroup)) {
      groups.push({
        cues: currentGroup,
        flags: [],
      })
      currentGroup = []
    }
  }

  if (currentGroup.length > 0)
    groups.push({
      cues: currentGroup,
      flags: [],
    })

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
      ...getTextQualityFlags(text),
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
