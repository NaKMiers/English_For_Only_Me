import { MissingEnvironmentError } from '@/constants/environments'
import type { VocabApiErrorDecision } from './vocabularyRouteDecisions'
import { VOCAB_MISSING_MONGODB_MESSAGE } from './vocabularyRouteDecisions'

export function toVocabApiError(error: unknown): VocabApiErrorDecision {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error.status === 401 ||
      error.status === 403 ||
      error.status === 409)
  )
    return {
      status: error.status,
      body: {
        message: (error as { message?: string }).message ?? 'Access denied.',
      },
    }

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: VOCAB_MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Vocabulary API request failed', error)

  return {
    status: 500,
    body: {
      message: 'Could not complete the vocabulary request.',
    },
  }
}
