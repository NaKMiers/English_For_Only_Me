import type { Messages } from '@/i18n/messages'
import { ForbiddenError, UnauthenticatedError } from '@/lib/auth/currentUser'

import { OutboxOwnerMismatchError } from './clientOwnerKey'
import { InvalidOwnerKeyError } from './ownerKey'

/**
 * The learner-facing status and text for the auth seam errors (signed out, a
 * session without a valid owner id, not an admin, queued for another account),
 * in the request's language. Null for any other error. The errors keep their
 * English `message` for logs.
 */
export function authErrorResponse(
  error: unknown,
  messages: Pick<Messages, 'common'>
): { message: string; status: 400 | 401 | 403 | 409 } | null {
  const errors = messages.common.errors

  if (error instanceof UnauthenticatedError)
    return { message: errors.unauthorized, status: error.status }
  if (error instanceof InvalidOwnerKeyError)
    return { message: errors.invalidRequest, status: error.status }
  if (error instanceof ForbiddenError)
    return { message: errors.forbidden, status: error.status }
  if (error instanceof OutboxOwnerMismatchError)
    return { message: errors.ownerMismatch, status: error.status }

  return null
}
