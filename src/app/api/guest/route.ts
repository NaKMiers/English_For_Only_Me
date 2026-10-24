import { NextResponse } from 'next/server'

import { OutboxOwnerMismatchError } from '@/lib/auth/clientOwnerKey'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'

export const runtime = 'nodejs'

/**
 * Mint (or confirm) the practice identity before a first-time visitor's first
 * write. The client outbox calls this once, so several writes queued at once
 * all land under the same guest id instead of each minting its own. Returns no
 * id: the guest id lives only in the httpOnly cookie.
 */
export async function POST() {
  try {
    const actor = await requirePracticeActor()

    return NextResponse.json({ isGuest: actor.isGuest })
  } catch (error) {
    if (error instanceof OutboxOwnerMismatchError)
      return NextResponse.json({ message: error.message }, { status: 409 })

    throw error
  }
}
