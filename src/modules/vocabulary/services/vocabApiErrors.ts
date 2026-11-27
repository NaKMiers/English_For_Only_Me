import { MissingEnvironmentError } from '@/constants/environments'
import { en, type Messages } from '@/i18n/messages/en'

import { MissingVietnameseMeaningError } from './userVocabItemService'
import type { VocabApiErrorDecision } from './vocabularyRouteDecisions'

function getStatusErrorMessage(
  error: { message?: string; status: 401 | 403 | 409 },
  t: Messages
) {
  if (error.status === 401) return t.common.errors.unauthorized
  if (error.status === 403) return t.common.errors.forbidden
  if (error instanceof MissingVietnameseMeaningError)
    return t.vocabulary.api.needsMeaning

  return error.message ?? t.common.errors.forbidden
}

export function toVocabApiError(
  error: unknown,
  t: Messages = en
): VocabApiErrorDecision {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error.status === 401 || error.status === 403 || error.status === 409)
  )
    return {
      status: error.status,
      body: {
        message: getStatusErrorMessage(
          error as { message?: string; status: 401 | 403 | 409 },
          t
        ),
      },
    }

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: t.vocabulary.api.missingMongo,
      },
    }

  console.error('Vocabulary API request failed', error)

  return {
    status: 500,
    body: {
      message: t.vocabulary.api.failed,
    },
  }
}
