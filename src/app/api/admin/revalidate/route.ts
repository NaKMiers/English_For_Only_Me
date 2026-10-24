import { NextResponse } from 'next/server'

import { getRevalidateSecret } from '@/constants/environments'
import { expireCacheTags } from '@/lib/db/revalidateCatalog'
import {
  decideRevalidateRequest,
  REVALIDATE_SECRET_HEADER,
  type RevalidateViewer,
} from '@/lib/db/revalidateRequest'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'

export const runtime = 'nodejs'

async function getViewer(): Promise<RevalidateViewer> {
  const user = await getOptionalUser()

  if (!user) return 'anonymous'

  return user.role === 'admin' ? 'admin' : 'user'
}

/**
 * Expire shared-content cache tags. For writes that happen outside the app's
 * own server actions - seed scripts, the content backfill - since the Next data
 * cache survives deploys. Accepts a signed-in admin, or the REVALIDATE_SECRET
 * in the `x-revalidate-secret` header.
 *
 *   curl -X POST "$SITE_URL/api/admin/revalidate" \
 *     -H "x-revalidate-secret: $REVALIDATE_SECRET" \
 *     -H 'content-type: application/json' \
 *     -d '{"tags":["grammar-content"]}'
 */
export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    body = null
  }

  const decision = decideRevalidateRequest({
    body,
    configuredSecret: getRevalidateSecret(),
    providedSecret: request.headers.get(REVALIDATE_SECRET_HEADER),
    viewer: await getViewer(),
  })

  if (!decision.ok)
    return NextResponse.json(
      { message: decision.message },
      { status: decision.status }
    )

  // Hard expiry: the next visit is a cache miss that sees the new content,
  // never the stale copy ('max' would serve the old one once more).
  expireCacheTags(decision.tags)

  return NextResponse.json({ revalidated: decision.tags })
}
