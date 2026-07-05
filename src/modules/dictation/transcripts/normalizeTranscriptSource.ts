import type {
  DictationCueRecord,
  DictationTranscriptQualityFlag,
  DictationTranscriptQualityStatus,
  DictationTranscriptSourceType,
} from '@/modules/dictation/types'

import { createTranscriptSourceHash } from './sourceHash'

interface NormalizeInput {
  language?: string
  rawText: string
  sourceType?: DictationTranscriptSourceType
}

export interface NormalizedTranscriptSource {
  cueCount: number
  language: string
  normalizedText: string
  qualityFlags: DictationTranscriptQualityFlag[]
  qualityStatus: DictationTranscriptQualityStatus
  rawCues: DictationCueRecord[]
  sourceHash: string
  sourceType: DictationTranscriptSourceType
}

const TIMECODE_PATTERN =
  /(?:(\d{1,2}):)?(\d{2}):(\d{2})(?:[,.](\d{1,3}))?\s*-->\s*(?:(\d{1,2}):)?(\d{2}):(\d{2})(?:[,.](\d{1,3}))?/

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function stripHtmlTags(value: string) {
  return value.replace(/<[^>]*>/g, ' ')
}

function toMilliseconds(parts: RegExpMatchArray, offset: 1 | 5) {
  const hours = Number(parts[offset] ?? 0)
  const minutes = Number(parts[offset + 1])
  const seconds = Number(parts[offset + 2])
  const rawMs = parts[offset + 3] ?? '0'
  const milliseconds = Number(rawMs.padEnd(3, '0').slice(0, 3))

  return hours * 3_600_000 + minutes * 60_000 + seconds * 1000 + milliseconds
}

function parseCaptionBlocks(rawText: string) {
  const blocks = rawText
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
  const cues: DictationCueRecord[] = []

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
    const timeLineIndex = lines.findIndex(line => TIMECODE_PATTERN.test(line))

    if (timeLineIndex < 0) continue

    const match = lines[timeLineIndex].match(TIMECODE_PATTERN)

    if (!match) continue

    const text = normalizeWhitespace(
      stripHtmlTags(lines.slice(timeLineIndex + 1).join(' '))
    )

    if (!text) continue

    cues.push({
      index: cues.length,
      text,
      startMs: toMilliseconds(match, 1),
      endMs: toMilliseconds(match, 5),
    })
  }

  return cues
}

function hasCaptionTiming(rawText: string) {
  return TIMECODE_PATTERN.test(rawText)
}

function inferSourceType(
  rawText: string,
  sourceType?: DictationTranscriptSourceType
): DictationTranscriptSourceType {
  if (sourceType) return sourceType

  if (hasCaptionTiming(rawText)) return 'captionFile'

  return 'manualText'
}

export function normalizeTranscriptSource({
  language = 'en',
  rawText,
  sourceType,
}: NormalizeInput): NormalizedTranscriptSource {
  const strippedText = stripHtmlTags(rawText)
  const inferredSourceType = inferSourceType(rawText, sourceType)
  const rawCues = hasCaptionTiming(rawText) ? parseCaptionBlocks(rawText) : []
  const normalizedText =
    rawCues.length > 0
      ? normalizeWhitespace(rawCues.map(cue => cue.text).join('\n'))
      : normalizeWhitespace(strippedText)
  const qualityFlags: DictationTranscriptQualityFlag[] = []

  if (rawText !== strippedText) qualityFlags.push('htmlStripped')
  if (inferredSourceType === 'captionFile') qualityFlags.push('captionFile')
  if (inferredSourceType === 'manualText') qualityFlags.push('manualText')
  if (rawCues.length > 0) qualityFlags.push('timed')
  if (rawCues.length === 0) qualityFlags.push('untimed')
  if (normalizedText.length < 20) qualityFlags.push('empty')
  if (normalizedText.length < 80 && normalizedText.length >= 20)
    qualityFlags.push('shortSource')
  if (normalizedText.length > 25_000) qualityFlags.push('longSource')

  const qualityStatus =
    normalizedText.length < 20
      ? 'blocked'
      : rawCues.length > 0 && !qualityFlags.includes('longSource')
        ? 'ready'
        : 'warning'

  return {
    cueCount: rawCues.length,
    language: language.toLowerCase(),
    normalizedText,
    qualityFlags,
    qualityStatus,
    rawCues,
    sourceHash: createTranscriptSourceHash({
      language,
      normalizedText,
      sourceType: inferredSourceType,
    }),
    sourceType: inferredSourceType,
  }
}
