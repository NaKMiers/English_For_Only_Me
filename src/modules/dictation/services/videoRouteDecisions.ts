import { hasMongoDbUri } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'

export const MISSING_MONGODB_MESSAGE =
  'MongoDB is not configured. Set MONGODB_URI on the server to use the dictation video library.'

type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 500 | 503

export interface ApiErrorDecision {
  status: ApiErrorStatus
  body: {
    message: string
  }
}

/**
 * Learner-facing text for an auth or owner error status (401, 403, 409), in
 * the request's language. The thrown errors carry English developer text.
 */
export function getAccessErrorMessage(status: number, t: Messages) {
  if (status === 401) return t.common.errors.unauthorized
  if (status === 409) return t.dictation.api.ownerMismatch

  return t.common.errors.forbidden
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
