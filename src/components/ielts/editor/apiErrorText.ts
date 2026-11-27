import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { IeltsAdminApiError } from '@/requests/ieltsAdminApi'

/**
 * The text to show for a failed admin request: the server's message (already
 * in the admin's language), else `fallback`, else the HTTP status, else a
 * generic error. A request error carries an empty message when the server sent
 * none, so the UI can say it in the right language.
 */
export function apiErrorText(
  caught: unknown,
  t: Messages,
  fallback?: string
): string {
  if (caught instanceof Error && caught.message) return caught.message
  if (fallback) return fallback
  if (caught instanceof IeltsAdminApiError)
    return format(t.ieltsEditor.errors.requestFailed, {
      status: caught.status,
    })

  return t.common.errors.generic
}
