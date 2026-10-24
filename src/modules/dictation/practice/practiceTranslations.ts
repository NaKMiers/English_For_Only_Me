import 'server-only'

import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { pickSegmentTranslationOverrides } from '@/modules/dictation/services/dictationSegmentRecords'
import type { CaptionCue } from '@/modules/dictation/translations/captionOverlap'

interface RawCueInput {
  endMs?: number | null
  startMs?: number | null
  text: string
}

export function toCaptionCues(rawCues: RawCueInput[] | null | undefined) {
  return (rawCues ?? []).map<CaptionCue>(cue => ({
    endMs: cue.endMs ?? null,
    startMs: cue.startMs ?? null,
    text: cue.text,
  }))
}

/** Every translation track for practice: a non-primary language with cues. */
function translationTrackFilter(videoId: string, defaultLanguage: string) {
  return {
    cueCount: { $gt: 0 },
    language: { $ne: defaultLanguage },
    videoId,
  }
}

/**
 * The practice page's translation data in two parallel reads: the list of
 * languages (names only) and the cues of the first one, which is the one the
 * page opens with. Other languages are fetched when the learner picks them.
 */
export async function loadInitialTranslationCues({
  defaultLanguage,
  videoId,
}: {
  defaultLanguage: string
  videoId: string
}) {
  const filter = translationTrackFilter(videoId, defaultLanguage)
  const [languages, firstTrack] = await Promise.all([
    DictationTranscriptModel.distinct('language', filter),
    DictationTranscriptModel.findOne(filter)
      .sort({ language: 1 })
      .select('language rawCues')
      .lean(),
  ])

  return {
    firstTrack: firstTrack
      ? {
          cues: toCaptionCues(firstTrack.rawCues),
          language: firstTrack.language,
        }
      : null,
    languages: languages.map(String).sort(),
  }
}

/** One language's cues and per-segment overrides, for an on-demand switch. */
export async function loadTranslationTrack({
  defaultLanguage,
  language,
  transcriptId,
  videoId,
}: {
  defaultLanguage: string
  language: string
  transcriptId: string
  videoId: string
}) {
  if (language === defaultLanguage) return null

  const [track, segments] = await Promise.all([
    DictationTranscriptModel.findOne({
      cueCount: { $gt: 0 },
      language,
      videoId,
    })
      .select('language rawCues')
      .lean(),
    // `language` is validated to a plain tag before it reaches this path.
    DictationSegmentModel.find({ transcriptId, videoId })
      .select(`translations.${language}`)
      .lean(),
  ])

  if (!track) return null

  return {
    cues: toCaptionCues(track.rawCues),
    language: track.language,
    overrides: pickSegmentTranslationOverrides(segments, language),
  }
}
