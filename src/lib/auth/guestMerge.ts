import 'server-only'

import { mergeGuestDataIntoUser } from '@/modules/dictation/services/mergeGuestData'
import { mergeGrammarGuestData } from '@/modules/grammar/services/mergeGrammarGuestData'
import { mergeIeltsGuestData } from '@/modules/ielts/services/mergeIeltsGuestData'

import {
  clearGuestCookie,
  getGuestId,
  getGuestMergeOwner,
  setGuestMergeOwner,
} from './guestUser'

export type GuestMergeStep = 'none' | 'merge' | 'abandon'

/**
 * What a sign-in does with the browser's guest data. Anonymous practice goes
 * to whoever signs in, except the leftovers of a merge that failed for
 * another account: those are abandoned, never handed to the next person on a
 * shared browser.
 */
export function guestMergeStep({
  guestId,
  pendingFor,
  userId,
}: {
  guestId: string | null
  pendingFor: string | null
  userId: string
}): GuestMergeStep {
  if (!guestId) return 'none'
  if (pendingFor && pendingFor !== userId) return 'abandon'

  return 'merge'
}

async function attempt(label: string, run: () => Promise<unknown>) {
  try {
    await run()

    return true
  } catch (error) {
    console.error(`Failed to merge guest ${label} data on sign-in`, error)

    return false
  }
}

/**
 * Fold the browser's anonymous practice into the account signing in. Every
 * module is tried even when one fails. When all succeed the guest cookie is
 * dropped; otherwise it stays, tagged with this account, so only this
 * account's next sign-in retries (re-running a merge whose rows already
 * moved is a no-op). Best-effort: never throws, never blocks login.
 */
export async function foldGuestIntoUser(userId: string) {
  try {
    const [guestId, pendingFor] = await Promise.all([
      getGuestId(),
      getGuestMergeOwner(),
    ])
    const step = guestMergeStep({ guestId, pendingFor, userId })

    if (step === 'none' || !guestId) return

    if (step === 'abandon') {
      await clearGuestCookie()
      return
    }

    const results = [
      await attempt('practice', () => mergeGuestDataIntoUser(guestId, userId)),
      await attempt('grammar', () => mergeGrammarGuestData(guestId, userId)),
      await attempt('IELTS', () => mergeIeltsGuestData(guestId, userId)),
    ]

    if (results.every(Boolean)) await clearGuestCookie()
    else await setGuestMergeOwner(userId)
  } catch (error) {
    console.error('Failed to merge guest practice data on sign-in', error)
  }
}
