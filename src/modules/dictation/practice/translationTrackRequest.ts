import type { ApiErrorDecision } from '@/modules/dictation/services/videoRouteDecisions'
import {
  isValidTranslationLanguage,
  normalizeTranslationLanguage,
} from '@/modules/dictation/translations/languages'

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

export type TranslationTrackRequestDecision =
  | { data: { language: string; videoId: string }; ok: true }
  | (ApiErrorDecision & { ok: false })

/**
 * Validate `?videoId=&language=` for the on-demand translation read. The
 * language becomes part of a projection path, so anything but a plain language
 * tag (no dots, no `$`) is refused here.
 */
export function parseTranslationTrackRequest(
  searchParams: URLSearchParams
): TranslationTrackRequestDecision {
  const videoId = searchParams.get('videoId') ?? ''
  const rawLanguage = searchParams.get('language') ?? ''

  if (
    !OBJECT_ID_PATTERN.test(videoId) ||
    !isValidTranslationLanguage(rawLanguage)
  )
    return {
      body: { message: 'A video id and a language code are required.' },
      ok: false,
      status: 400,
    }

  return {
    data: { language: normalizeTranslationLanguage(rawLanguage), videoId },
    ok: true,
  }
}
