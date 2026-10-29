import { ieltsJsonError } from '@/modules/ielts/http'

export const runtime = 'nodejs'

/** Tests are edited in place now; there are no new versions to create. */
export function POST() {
  return ieltsJsonError(
    410,
    'Tests are edited in place. Open the test to edit it.'
  )
}
