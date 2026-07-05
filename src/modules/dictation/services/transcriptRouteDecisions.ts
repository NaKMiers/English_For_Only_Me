import { transcriptPayloadSchema } from '@/modules/dictation/schemas/transcriptPayloadSchema'
import { normalizeTranscriptSource } from '@/modules/dictation/transcripts/normalizeTranscriptSource'

export function parseTranscriptRequest(body: unknown) {
  const parsed = transcriptPayloadSchema.safeParse(body)

  if (!parsed.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: parsed.error.issues[0]?.message ?? 'Invalid transcript.',
      },
    } as const

  const normalized = normalizeTranscriptSource({
    language: parsed.data.language,
    rawText: parsed.data.rawText,
    sourceType: parsed.data.sourceType,
  })

  if (normalized.qualityStatus === 'blocked')
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Transcript source does not contain usable English text.',
      },
    } as const

  return {
    ok: true,
    data: {
      videoId: parsed.data.videoId,
      normalized,
    },
  } as const
}
