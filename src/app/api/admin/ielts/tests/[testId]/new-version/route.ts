import { getMessages } from '@/i18n/server'
import { ieltsJsonError } from '@/modules/ielts/http'

export const runtime = 'nodejs'

/** Tests are edited in place now; there are no new versions to create. */
export async function POST() {
  const t = await getMessages()

  return ieltsJsonError(410, t.ieltsEditor.api.editedInPlace)
}
