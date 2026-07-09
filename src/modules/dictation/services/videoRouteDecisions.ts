import { hasMongoDbUri } from '@/constants/environments'
import {
  createDictationVideoPayloadSchema,
  updateDictationVideoPayloadSchema,
} from '@/modules/dictation/schemas/videoPayloadSchema'
import { normalizeTranslationLanguage } from '@/modules/dictation/translations/languages'

export const MISSING_MONGODB_MESSAGE =
  'MongoDB is not configured. Set MONGODB_URI on the server to use the dictation video library.'

type ApiErrorStatus = 400 | 404 | 409 | 500 | 503

export interface ApiErrorDecision {
  status: ApiErrorStatus
  body: {
    message: string
  }
}

interface CreateVideoInput {
  ownerId: string
  body: unknown
}

export function getMissingMongoResponse() {
  if (hasMongoDbUri()) return null

  return {
    status: 500,
    body: {
      message: MISSING_MONGODB_MESSAGE,
    },
  } satisfies ApiErrorDecision
}

export function parseCreateVideoRequest({ body, ownerId }: CreateVideoInput) {
  const parsed = createDictationVideoPayloadSchema.safeParse(body)

  if (!parsed.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: parsed.error.issues[0]?.message ?? 'Invalid video payload.',
      },
    } as const

  const title = parsed.data.title ?? 'Untitled dictation video'

  return {
    ok: true,
    data: {
      ownerId,
      title,
      youtubeUrl: parsed.data.youtubeUrl,
      transcriptStatus: parsed.data.transcriptStatus,
      status: 'needsTranscript' as const,
    },
  } as const
}

export function parseUpdateVideoRequest(body: unknown) {
  const parsed = updateDictationVideoPayloadSchema.safeParse(body)

  if (!parsed.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: parsed.error.issues[0]?.message ?? 'Invalid video payload.',
      },
    } as const

  return {
    ok: true,
    data: {
      defaultLanguage: normalizeTranslationLanguage(
        parsed.data.defaultLanguage
      ),
    },
  } as const
}
