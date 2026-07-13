import { extractYouTubeId } from '@/lib/youtube/extractYouTubeId'
import { youtubeImportPayloadSchema } from '@/modules/dictation/schemas/youtubeImportPayloadSchema'
import type { DictationVideoStatus } from '@/modules/dictation/types'

export function getReimportedVideoStatus(
  existingStatus: DictationVideoStatus | null | undefined
) {
  return !existingStatus || existingStatus === 'archived'
    ? ('needsTranscript' as const)
    : existingStatus
}

export function parseYouTubeImportRequest(body: unknown) {
  const parsed = youtubeImportPayloadSchema.safeParse(body)

  if (!parsed.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: parsed.error.issues[0]?.message ?? 'Invalid YouTube import.',
      },
    } as const

  const extracted = extractYouTubeId(parsed.data.youtubeUrl)

  if (!extracted.ok)
    return {
      ok: false,
      status: 400,
      body: {
        message: extracted.message,
      },
    } as const

  return {
    ok: true,
    data: {
      youtubeUrl: parsed.data.youtubeUrl,
      normalizedUrl: extracted.normalizedUrl,
      videoId: extracted.videoId,
    },
  } as const
}
