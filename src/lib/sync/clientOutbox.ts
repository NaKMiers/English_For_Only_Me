'use client'

import { loginUrlFor } from '@/lib/auth/callbackUrl'
import { createOutbox, type Outbox } from '@/lib/sync/outbox'

const TAB_ID_STORAGE_KEY = 'efom.outbox.tab'
const TAB_CLAIM_KEY_PREFIX = 'efom.outbox.tab-claim.'
// Longer than the once-a-minute timer throttling of a long-hidden tab, so a
// live background tab never looks gone.
export const TAB_CLAIM_TTL_MS = 2 * 60_000
const TAB_CLAIM_REFRESH_MS = 20_000

interface CurrentOutbox {
  outbox: Outbox
  owner: string
  removeListeners: () => void
}

interface TabClaim {
  at: number
  pageId: string
}

let current: CurrentOutbox | null = null
let pageTabId: string | null = null

function getBrowserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function mintTabId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// One per page load: tells this page's claim apart from a duplicate's.
const pageId = mintTabId()

function getTabClaimKey(tabId: string) {
  return `${TAB_CLAIM_KEY_PREFIX}${tabId}`
}

function readTabClaim(storage: Storage, tabId: string): TabClaim | null {
  try {
    const parsed = JSON.parse(storage.getItem(getTabClaimKey(tabId)) ?? 'null')

    return parsed && typeof parsed.pageId === 'string'
      ? { at: Number(parsed.at) || 0, pageId: parsed.pageId }
      : null
  } catch {
    return null
  }
}

function writeTabClaim(storage: Storage, tabId: string) {
  try {
    storage.setItem(
      getTabClaimKey(tabId),
      JSON.stringify({ at: Date.now(), pageId })
    )
  } catch {
    // Storage full or blocked: duplicate detection is best effort.
  }
}

/**
 * A tab killed without pagehide (mobile, crash) never removes its claim, so
 * drop every claim that has run out.
 */
function removeExpiredTabClaims(storage: Storage) {
  try {
    const expired: string[] = []

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)

      if (!key?.startsWith(TAB_CLAIM_KEY_PREFIX)) continue

      const claim = readTabClaim(
        storage,
        key.slice(TAB_CLAIM_KEY_PREFIX.length)
      )

      if (!claim || Date.now() - claim.at >= TAB_CLAIM_TTL_MS) expired.push(key)
    }

    for (const key of expired) storage.removeItem(key)
  } catch {
    // Blocked storage: nothing to clean.
  }
}

/**
 * Keep this page's claim on its tab id fresh while it is open. A reload fires
 * pagehide first, so the next load finds no claim and keeps the id; a page put
 * in the back-forward cache claims it again when it comes back.
 */
function holdTabClaim(storage: Storage, tabId: string) {
  writeTabClaim(storage, tabId)
  setInterval(() => writeTabClaim(storage, tabId), TAB_CLAIM_REFRESH_MS)
  window.addEventListener('pagehide', () => {
    try {
      if (readTabClaim(storage, tabId)?.pageId === pageId)
        storage.removeItem(getTabClaimKey(tabId))
    } catch {
      // Blocked storage: the claim expires on its own.
    }
  })
  window.addEventListener('pageshow', event => {
    if (event.persisted) writeTabClaim(storage, tabId)
  })
}

/**
 * Stable for this tab across reloads (sessionStorage is per tab), so a reload
 * picks its own queue back up instead of waiting for the lease to expire.
 * Duplicating a tab copies its sessionStorage, so a copied id that another
 * open page still claims is replaced: two pages sharing one queue key would
 * overwrite each other's writes.
 */
function getTabId() {
  if (pageTabId) return pageTabId

  const storage = getBrowserStorage()

  if (storage) removeExpiredTabClaims(storage)

  try {
    let tabId = window.sessionStorage.getItem(TAB_ID_STORAGE_KEY)
    const claim = tabId && storage ? readTabClaim(storage, tabId) : null
    const isDuplicate =
      claim !== null &&
      claim.pageId !== pageId &&
      Date.now() - claim.at < TAB_CLAIM_TTL_MS

    if (!tabId || isDuplicate) {
      tabId = mintTabId()
      window.sessionStorage.setItem(TAB_ID_STORAGE_KEY, tabId)
    }

    pageTabId = tabId
  } catch {
    pageTabId = mintTabId()
  }

  if (storage) holdTabClaim(storage, pageTabId)

  return pageTabId
}

function listenForPageHide(outbox: Outbox) {
  // Unloading (or entering the back-forward cache): the browser cancels
  // in-flight requests, so resend those too, and release the queue so the
  // next tab or load takes it over at once.
  const onPageHide = () => {
    outbox.flushWithKeepalive({ includeInFlight: true })
    outbox.markReleased()
  }
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) outbox.resume()
  }
  // Only hidden: requests keep running, so send just what is waiting.
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') outbox.flushWithKeepalive()
  }

  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('pageshow', onPageShow)
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('pageshow', onPageShow)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}

/**
 * Stop the outbox of the previous owner (a sign-out and a sign-in as someone
 * else without a full reload). Its queue stays in storage for when that
 * learner is back; it is never sent as the new one.
 */
function retirePrevious() {
  if (!current) return

  const previous = current

  current = null
  previous.removeListeners()
  previous.outbox.dispose()
}

/**
 * The session ended while writes were queued (R1). The outbox keeps them and
 * has paused; release the stored queue so the next load takes it over at once,
 * then send the tab to the login page with this page as the way back. The
 * pagehide handlers go first: a keepalive resend would only meet another 401.
 * Signing back in as the same learner gives the same owner key, so the queue
 * replays; another account never sees it.
 */
function handleUnauthorized(entry: () => CurrentOutbox | null) {
  let handled = false

  return () => {
    const active = entry()

    if (handled || !active) return

    handled = true
    active.removeListeners()
    active.outbox.markReleased()
    window.location.assign(
      loginUrlFor(`${window.location.pathname}${window.location.search}`)
    )
  }
}

/**
 * One shared outbox for the whole tab, so every component that writes for the
 * same learner shares lanes and ordering. Pass the client owner key the server
 * rendered (a hash of the user id).
 */
export function getClientOutbox(ownerKey: string): Outbox {
  // During server rendering there is nothing to deliver, and a module-level
  // cache would be shared across every request's learner, so never cache.
  if (typeof window === 'undefined') return createOutbox({ owner: ownerKey })

  if (current?.owner === ownerKey) return current.outbox

  retirePrevious()

  let entry: CurrentOutbox | null = null
  const outbox = createOutbox({
    onUnauthorized: handleUnauthorized(() => entry),
    owner: ownerKey,
    storage: getBrowserStorage(),
    tabId: getTabId(),
  })

  entry = {
    outbox,
    owner: ownerKey,
    removeListeners: listenForPageHide(outbox),
  }
  current = entry

  return outbox
}
