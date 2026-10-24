/**
 * Client-first write queue. The UI applies a change immediately, enqueues the
 * write here, and the outbox delivers it to the server in the background.
 *
 *   enqueue() --> [lane A: item1 -> item2 -> ...]  (ordered, one in flight)
 *                 [lane B: item1 -> ...]           (lanes run in parallel)
 *        |
 *        +--> localStorage `efom.outbox.v1.<owner>.<tabId>` so a reload or
 *             tab close replays it
 *
 *   send --> 2xx           : drop item, resolve(ok)       -> caller reconciles
 *        --> network       : keep item, backoff, retry    -> caller waits
 *        --> 5xx / 429     : same, until MAX_SERVER_ERROR_ATTEMPTS, then failed
 *        --> 4xx           : drop item, resolve(failed)   -> caller rolls back
 *
 * Every tab writes only its own storage key, with a heartbeat while it has
 * items. A tab that starts up adopts the queues other tabs of the same owner
 * left behind (released on pagehide, or heartbeat older than the lease), so a
 * closed tab's writes are still delivered without two live tabs fighting over
 * one key. A tab whose queue was adopted while it was frozen notices on its
 * next write to storage and hands those items over instead of resending them.
 *
 * Multi-tab safety beyond that comes from the server, not from locks: attempt
 * routes dedupe on a client-minted idempotency key before applying any state
 * change, so two tabs replaying the same attempt apply it once. Every other
 * write must set a desired state (setFavorite, setStatus) and never toggle, so
 * a duplicate of it is harmless; a stale one is bounded by
 * MAX_SET_STATE_ITEM_AGE_MS on replay.
 */

export type OutboxMethod = 'DELETE' | 'PATCH' | 'POST' | 'PUT'

export interface OutboxItem {
  attempts: number
  body: unknown
  createdAt: number
  id: string
  lane: string
  mergeKey: string | null
  method: OutboxMethod
  owner: string
  /** 5xx / 429 / 408 answers so far; network failures are not counted. */
  serverErrors?: number
  url: string
}

export interface OutboxEnqueueInput {
  body: unknown
  /** Stable id; doubles as the idempotency key. Minted once when omitted. */
  id?: string
  lane: string
  /**
   * When the newest queued (not in-flight) item in the same lane has this
   * mergeKey, it is replaced instead of appended. Last write wins without
   * reordering anything behind it.
   */
  mergeKey?: string
  method?: OutboxMethod
  url: string
}

export type OutboxResult =
  | { data: unknown; ok: true; status: number }
  | { error: string; ok: false; status: number }

/** A queued item handed from one outbox to another, with its waiting caller. */
export interface OutboxHandOffEntry {
  item: OutboxItem
  resolve?: (result: OutboxResult) => void
}

export interface OutboxStorage {
  getItem(key: string): string | null
  /** Enumeration (as on localStorage) lets a tab find queues others left. */
  key?(index: number): string | null
  readonly length?: number
  removeItem(key: string): void
  setItem(key: string, value: string): void
}

export interface OutboxOptions {
  /**
   * Other owners whose stored queues this outbox takes over at startup (the
   * same learner under an earlier key). Their items are re-owned and their
   * storage keys removed.
   */
  adoptOwners?: string[]
  /** Items released by another outbox in this tab, delivered first. */
  adoptItems?: OutboxHandOffEntry[]
  fetchImpl?: typeof fetch
  /** Inclusive cap for one keepalive request body (browsers allow 64 KB). */
  keepaliveBudgetBytes?: number
  /** A tab whose heartbeat is older than this is gone; its queue is adopted. */
  leaseMs?: number
  maxRetryDelayMs?: number
  /** Called for every settled item, including ones replayed after a reload. */
  onSettled?: (item: OutboxItem, result: OutboxResult) => void
  owner: string
  retryBaseDelayMs?: number
  storage?: OutboxStorage | null
  /** This tab's id. Keep it stable across reloads (sessionStorage). */
  tabId?: string
}

export interface Outbox {
  /**
   * Stop delivering. Queued items stay stored and replay on a later load;
   * their waiting callers are told the write did not go through here.
   */
  dispose(): void
  enqueue(input: OutboxEnqueueInput): Promise<OutboxResult>
  /**
   * Send the head of every lane with keepalive. The rest stays stored and
   * replays in order on the next load. On pagehide pass `includeInFlight`:
   * the browser cancels in-flight requests on unload. A tab that is only
   * hidden keeps them running, so resending them would only race them.
   */
  flushWithKeepalive(options?: { includeInFlight?: boolean }): void
  /**
   * For pagehide: mark this tab's stored queue as released, so another tab
   * (or the next load) takes it over at once instead of waiting out the lease.
   */
  markReleased(): void
  pendingCount(): number
  /** Copies of every queued item, oldest first per lane. */
  pendingItems(): OutboxItem[]
  /**
   * Stop this outbox and hand every queued item, with its waiting caller, to
   * another outbox. Clears this outbox's storage key.
   */
  release(): OutboxHandOffEntry[]
  /** For pageshow from the back-forward cache: undo `markReleased`. */
  resume(): void
  subscribe(listener: () => void): () => void
  /**
   * True once every lane drained, false when `timeoutMs` passed first (or the
   * outbox was disposed). Callers that block UI must pass a timeout.
   */
  whenIdle(options?: { timeoutMs?: number }): Promise<boolean>
}

export const OUTBOX_STORAGE_PREFIX = 'efom.outbox.v1.'
/** Request header naming the client owner key every outbox write is for. */
export const OUTBOX_OWNER_HEADER = 'x-outbox-owner'
/**
 * The owner used before a first-time visitor has a guest cookie. Only a guest
 * actor matches it on the server.
 */
export const ANONYMOUS_OUTBOX_OWNER = 'anonymous'

const DEFAULT_KEEPALIVE_BUDGET_BYTES = 60_000
// Longer than the once-a-minute timer throttling of a long-hidden tab (its
// heartbeat runs every lease / 3), so a live background tab never looks gone.
// A closed tab marks its queue released on pagehide, so this only delays the
// rarer case of a tab killed without one.
const DEFAULT_LEASE_MS = 150_000
const DEFAULT_RETRY_BASE_DELAY_MS = 1_000
const DEFAULT_MAX_RETRY_DELAY_MS = 30_000
// Replayed items older than this are dropped: a week-old queued answer is more
// likely to confuse than help, and it bounds what an abandoned tab can leave.
const MAX_ITEM_AGE_MS = 7 * 24 * 60 * 60 * 1000
// A set-state write (it has a mergeKey) replayed long after it was made can
// overwrite newer progress made elsewhere since, so it expires much sooner.
const MAX_SET_STATE_ITEM_AGE_MS = 12 * 60 * 60 * 1000
// A server that keeps failing on one item would block its lane for good.
// Network failures (status 0) still retry forever: an offline learner must not
// lose writes.
export const MAX_SERVER_ERROR_ATTEMPTS = 20

/** The pre-tab, single shared key. Read once at startup for migration. */
export function getOutboxStorageKey(owner: string) {
  return `${OUTBOX_STORAGE_PREFIX}${owner}`
}

export function getOutboxTabStorageKey(owner: string, tabId: string) {
  return `${getOutboxStorageKey(owner)}.${tabId}`
}

function createItemId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isRetryableStatus(status: number) {
  return status === 0 || status === 408 || status === 429 || status >= 500
}

function readErrorMessage(data: unknown, status: number) {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message

    if (typeof message === 'string' && message) return message
  }

  return `Request failed with status ${status}.`
}

interface StoredQueue {
  heartbeatAt: number
  items: OutboxItem[]
}

function isStoredItem(item: unknown, now: number): item is OutboxItem {
  if (!item || typeof item !== 'object') return false

  const candidate = item as OutboxItem
  const maxAgeMs = candidate.mergeKey
    ? MAX_SET_STATE_ITEM_AGE_MS
    : MAX_ITEM_AGE_MS

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.lane === 'string' &&
    typeof candidate.url === 'string' &&
    now - Number(candidate.createdAt) < maxAgeMs
  )
}

function getMergeSlot(lane: string, mergeKey: string) {
  return `${lane}\u0000${mergeKey}`
}

const DISPOSED_RESULT: OutboxResult = {
  error: 'This write was not sent: the learner changed. It is kept for later.',
  ok: false,
  status: 0,
}

/** Reads both the per-tab `{heartbeatAt, items}` shape and the legacy array. */
function readStoredQueue(
  storage: OutboxStorage,
  key: string,
  now: number
): StoredQueue | null {
  try {
    const raw = storage.getItem(key)

    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    const isLegacy = Array.isArray(parsed)
    const items: unknown = isLegacy
      ? parsed
      : (parsed as { items?: unknown } | null)?.items
    const heartbeatAt = isLegacy
      ? 0
      : Number((parsed as { heartbeatAt?: unknown }).heartbeatAt) || 0

    if (!Array.isArray(items)) return { heartbeatAt, items: [] }

    return {
      heartbeatAt,
      items: items.filter(item => isStoredItem(item, now)),
    }
  } catch {
    // A corrupt queue must never break the page; it is rebuilt on next write.
    return null
  }
}

/** Every per-tab key stored for `owner`, in this browser. */
function listTabStorageKeys(storage: OutboxStorage, owner: string) {
  const prefix = `${getOutboxStorageKey(owner)}.`
  const keys: string[] = []

  if (typeof storage.key !== 'function' || typeof storage.length !== 'number')
    return keys

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index)

      if (key?.startsWith(prefix)) keys.push(key)
    }
  } catch {
    // Storage blocked: nothing to adopt.
  }

  return keys
}

export function createOutbox({
  adoptItems = [],
  adoptOwners = [],
  fetchImpl,
  keepaliveBudgetBytes = DEFAULT_KEEPALIVE_BUDGET_BYTES,
  leaseMs = DEFAULT_LEASE_MS,
  maxRetryDelayMs = DEFAULT_MAX_RETRY_DELAY_MS,
  onSettled,
  owner,
  retryBaseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
  storage = null,
  tabId = createItemId(),
}: OutboxOptions): Outbox {
  const send = fetchImpl ?? ((...args) => fetch(...args))
  const storageKey = getOutboxTabStorageKey(owner, tabId)
  const lanes = new Map<string, OutboxItem[]>()
  const inFlight = new Set<string>()
  const waiters = new Map<string, (result: OutboxResult) => void>()
  const retryTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const listeners = new Set<() => void>()
  let idleWaiters: Array<(idle: boolean) => void> = []
  // Lane + mergeKey of every write this page queued itself. A queue adopted
  // late must not replay an older value into one of these slots.
  const localMergeSlots = new Set<string>()
  let heartbeat: ReturnType<typeof setInterval> | null = null
  let rescanTimer: ReturnType<typeof setTimeout> | null = null
  let disposed = false
  let released = false
  // Whether this tab's key currently holds items it wrote.
  let hasStoredItems = false

  function allItems() {
    return [...lanes.values()].flat()
  }

  function stopHeartbeat() {
    if (heartbeat) clearInterval(heartbeat)
    heartbeat = null
  }

  function removeStorageKey(key: string) {
    try {
      storage?.removeItem(key)
    } catch {
      // Storage blocked: the copy in memory is still delivered once.
    }
  }

  function resolveSuperseded(id: string) {
    waiters.get(id)?.({ data: { superseded: true }, ok: true, status: 200 })
    waiters.delete(id)
  }

  /**
   * Another tab adopted this tab's queue while this one looked gone (frozen,
   * or its timers throttled past the lease): this tab's key is gone and the
   * other tab now stores these items. Hand them over instead of resending
   * them, which could land an older set-state write after a newer one. A key
   * that vanished with no adopter (site data cleared) keeps the items here.
   */
  function handOverIfAdopted(store: OutboxStorage) {
    try {
      if (store.getItem(storageKey) !== null) return
    } catch {
      return
    }

    const adoptedIds = new Set<string>()

    for (const key of listTabStorageKeys(store, owner)) {
      if (key === storageKey) continue

      for (const item of readStoredQueue(store, key, Date.now())?.items ?? [])
        adoptedIds.add(item.id)
    }

    if (adoptedIds.size === 0) return

    const changedLanes: string[] = []

    for (const [lane, queue] of lanes) {
      // A head already in flight settles here; the adopter's copy of it is
      // deduped (attempts) or sets the same state (everything else).
      const keepHead = inFlight.has(lane) ? queue.slice(0, 1) : []
      const rest = queue.slice(keepHead.length)
      const kept = rest.filter(item => !adoptedIds.has(item.id))

      if (kept.length === rest.length) continue

      for (const item of rest)
        if (adoptedIds.has(item.id)) resolveSuperseded(item.id)

      const next = [...keepHead, ...kept]

      if (next.length === 0) lanes.delete(lane)
      else lanes.set(lane, next)

      const retryTimer = retryTimers.get(lane)

      if (retryTimer && keepHead.length === 0) {
        clearTimeout(retryTimer)
        retryTimers.delete(lane)
      }

      changedLanes.push(lane)
    }

    if (changedLanes.length === 0) return

    // Called from inside persist(): restart the lanes once it has returned.
    queueMicrotask(() => {
      notify()
      for (const lane of changedLanes) pump(lane)
    })
  }

  /** Returns false when the queue could not be written to storage. */
  function persist() {
    if (!storage) return true

    if (hasStoredItems && !disposed) handOverIfAdopted(storage)

    const items = allItems()
    let saved = true

    try {
      if (items.length === 0) storage.removeItem(storageKey)
      else
        storage.setItem(
          storageKey,
          JSON.stringify({ heartbeatAt: released ? 0 : Date.now(), items })
        )
      hasStoredItems = items.length > 0
    } catch {
      // Storage full or blocked: delivery still works for this page lifetime.
      saved = false
    }

    // The heartbeat tells other tabs this queue is still being worked on, so
    // it only runs while there is something to protect.
    if (items.length === 0 || disposed || released) stopHeartbeat()
    else heartbeat ??= setInterval(persist, Math.max(leaseMs / 3, 1))

    return saved
  }

  function notify() {
    for (const listener of listeners) listener()

    if (allItems().length === 0) {
      const resolved = idleWaiters

      idleWaiters = []
      for (const resolve of resolved) resolve(true)
    }
  }

  function settle(item: OutboxItem, result: OutboxResult) {
    const queue = lanes.get(item.lane) ?? []
    const remaining = queue.filter(queued => queued.id !== item.id)

    if (remaining.length === 0) lanes.delete(item.lane)
    else lanes.set(item.lane, remaining)

    persist()
    waiters.get(item.id)?.(result)
    waiters.delete(item.id)
    onSettled?.(item, result)
    notify()
  }

  function buildRequest(item: OutboxItem, body: string | undefined) {
    return {
      body: item.method === 'DELETE' ? undefined : body,
      headers: {
        'content-type': 'application/json',
        'idempotency-key': item.id,
        [OUTBOX_OWNER_HEADER]: owner,
      },
      method: item.method,
    }
  }

  async function deliver(item: OutboxItem): Promise<OutboxResult> {
    try {
      const response = await send(
        item.url,
        buildRequest(item, JSON.stringify(item.body))
      )
      const data: unknown = await response.json().catch(() => null)

      if (response.ok) return { data, ok: true, status: response.status }

      return {
        error: readErrorMessage(data, response.status),
        ok: false,
        status: response.status,
      }
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : 'Network request failed.',
        ok: false,
        status: 0,
      }
    }
  }

  function pump(lane: string) {
    if (disposed || inFlight.has(lane) || retryTimers.has(lane)) return

    const head = lanes.get(lane)?.[0]

    if (!head) return

    inFlight.add(lane)
    head.attempts += 1
    persist()

    void deliver(head).then(result => {
      inFlight.delete(lane)

      if (disposed) return

      if (!result.ok && result.status !== 0)
        head.serverErrors = (head.serverErrors ?? 0) + 1

      const canRetry =
        result.status === 0 ||
        (head.serverErrors ?? 0) < MAX_SERVER_ERROR_ATTEMPTS

      if (!result.ok && isRetryableStatus(result.status) && canRetry) {
        // Never wait longer than the cap between tries.
        persist()

        const delay = Math.min(
          retryBaseDelayMs * 2 ** Math.min(head.attempts - 1, 20),
          maxRetryDelayMs
        )

        retryTimers.set(
          lane,
          setTimeout(() => {
            retryTimers.delete(lane)
            pump(lane)
          }, delay)
        )
        notify()
        return
      }

      settle(head, result)
      pump(lane)
    })
  }

  /**
   * Put adopted items ahead of this tab's own queued items (they are older),
   * but never ahead of a head that is already in flight.
   */
  function adoptEntries(entries: OutboxHandOffEntry[]) {
    const known = new Set(allItems().map(item => item.id))
    const byLane = new Map<string, OutboxItem[]>()

    for (const { item, resolve } of entries) {
      if (known.has(item.id)) continue

      // This page already set that state itself, after the adopted write was
      // made: replaying the adopted one would undo it.
      if (
        item.mergeKey &&
        localMergeSlots.has(getMergeSlot(item.lane, item.mergeKey))
      ) {
        resolve?.({ data: { superseded: true }, ok: true, status: 200 })
        continue
      }

      known.add(item.id)
      if (resolve) waiters.set(item.id, resolve)

      const adopted = byLane.get(item.lane) ?? []

      adopted.push({ ...item, owner })
      byLane.set(item.lane, adopted)
    }

    for (const [lane, adopted] of byLane) {
      const queue = lanes.get(lane) ?? []
      const keepHead = inFlight.has(lane) ? queue.slice(0, 1) : []

      lanes.set(lane, [
        ...keepHead,
        ...adopted,
        ...queue.slice(keepHead.length),
      ])
    }

    return byLane.size > 0
  }

  /**
   * Take over queues this browser holds for this learner that no live tab is
   * working on. Returns the storage keys to delete once the adopted items are
   * safely written under this tab's own key.
   */
  function collectOrphanedQueues(now: number) {
    const entries: OutboxHandOffEntry[] = []
    const keysToRemove: string[] = []
    let sawLiveTab = false

    if (!storage) return { entries, keysToRemove, sawLiveTab }

    for (const candidate of [owner, ...adoptOwners]) {
      const legacyKey = getOutboxStorageKey(candidate)
      const legacy = readStoredQueue(storage, legacyKey, now)

      if (legacy) {
        entries.push(...legacy.items.map(item => ({ item })))
        keysToRemove.push(legacyKey)
      }

      for (const key of listTabStorageKeys(storage, candidate)) {
        if (key === storageKey) continue

        const queue = readStoredQueue(storage, key, now)
        // This tab's own queue under an earlier owner key is never live: the
        // tab now runs this outbox instead.
        const isThisTab = key === getOutboxTabStorageKey(candidate, tabId)
        const isStale = !queue || now - queue.heartbeatAt > leaseMs

        if (!isThisTab && !isStale) {
          if (candidate === owner) sawLiveTab = true
          continue
        }

        if (queue) entries.push(...queue.items.map(item => ({ item })))
        keysToRemove.push(key)
      }
    }

    return { entries, keysToRemove, sawLiveTab }
  }

  function adoptOrphanedQueues() {
    const { entries, keysToRemove, sawLiveTab } = collectOrphanedQueues(
      Date.now()
    )
    const adopted = adoptEntries(entries)
    // Delete the other tabs' copies only once this tab holds them in storage,
    // or a failed write would leave them in memory alone.
    const saved = adopted ? persist() : true

    if (saved) for (const key of keysToRemove) removeStorageKey(key)

    return { adopted, sawLiveTab }
  }

  function enqueue(input: OutboxEnqueueInput): Promise<OutboxResult> {
    if (disposed) return Promise.resolve(DISPOSED_RESULT)

    const item: OutboxItem = {
      attempts: 0,
      body: input.body,
      createdAt: Date.now(),
      id: input.id ?? createItemId(),
      lane: input.lane,
      mergeKey: input.mergeKey ?? null,
      method: input.method ?? 'POST',
      owner,
      url: input.url,
    }
    if (item.mergeKey)
      localMergeSlots.add(getMergeSlot(item.lane, item.mergeKey))

    const queue = lanes.get(item.lane) ?? []
    const tail = queue.at(-1)
    const tailIsMergeable =
      tail !== undefined &&
      item.mergeKey !== null &&
      tail.mergeKey === item.mergeKey &&
      !(inFlight.has(item.lane) && queue.length === 1)

    if (tailIsMergeable) {
      // The replaced write never reached the server, so its caller is told it
      // was superseded rather than left waiting forever.
      resolveSuperseded(tail.id)
      queue[queue.length - 1] = item
    } else queue.push(item)

    lanes.set(item.lane, queue)
    persist()

    const result = new Promise<OutboxResult>(resolve => {
      waiters.set(item.id, resolve)
    })

    notify()
    pump(item.lane)

    return result
  }

  function flushWithKeepalive({
    includeInFlight = false,
  }: { includeInFlight?: boolean } = {}) {
    // Only lane heads: sending a whole lane at once would race its items out
    // of order. In-flight heads only on unload, when the browser cancels them;
    // a duplicate that does land is deduped or sets the same state.
    let budget = keepaliveBudgetBytes

    for (const [lane, queue] of lanes) {
      const head = queue[0]

      if (!head || (!includeInFlight && inFlight.has(lane))) continue

      const body = JSON.stringify(head.body)

      // Browsers reject keepalive bodies past ~64 KB in total, so skip what
      // does not fit. Anything not sent replays from storage next load.
      if (body.length > budget) continue

      budget -= body.length
      send(head.url, { ...buildRequest(head, body), keepalive: true }).catch(
        () => {}
      )
    }
  }

  function whenIdle({ timeoutMs }: { timeoutMs?: number } = {}) {
    if (allItems().length === 0) return Promise.resolve(true)

    return new Promise<boolean>(resolve => {
      let timer: ReturnType<typeof setTimeout> | null = null
      const waiter = (idle: boolean) => {
        if (timer) clearTimeout(timer)
        resolve(idle)
      }

      idleWaiters.push(waiter)

      if (timeoutMs === undefined) return

      timer = setTimeout(() => {
        idleWaiters = idleWaiters.filter(queued => queued !== waiter)
        resolve(false)
      }, timeoutMs)
    })
  }

  function subscribe(listener: () => void) {
    listeners.add(listener)

    return () => {
      listeners.delete(listener)
    }
  }

  function stop() {
    disposed = true
    stopHeartbeat()
    if (rescanTimer) clearTimeout(rescanTimer)
    rescanTimer = null
    for (const timer of retryTimers.values()) clearTimeout(timer)
    retryTimers.clear()
    listeners.clear()

    const resolved = idleWaiters

    idleWaiters = []
    for (const resolve of resolved) resolve(false)
  }

  function dispose() {
    stop()

    // The items stay stored for this owner; tell their callers they did not
    // go through, so no UI waits on them forever.
    const pending = [...waiters.values()]

    waiters.clear()
    for (const resolve of pending) resolve(DISPOSED_RESULT)
  }

  function markReleased() {
    if (disposed) return

    released = true
    persist()
  }

  function resume() {
    if (disposed || !released) return

    released = false
    persist()
  }

  function release() {
    const entries = allItems().map(item => ({
      item,
      resolve: waiters.get(item.id),
    }))

    stop()
    lanes.clear()
    waiters.clear()

    removeStorageKey(storageKey)

    return entries
  }

  // MARK: Startup

  for (const item of storage
    ? (readStoredQueue(storage, storageKey, Date.now())?.items ?? [])
    : []) {
    const queue = lanes.get(item.lane) ?? []

    queue.push(item)
    lanes.set(item.lane, queue)
  }

  adoptEntries(adoptItems)

  const { sawLiveTab } = adoptOrphanedQueues()

  persist()

  // A tab closed moments ago still looks live. Look once more after its lease
  // runs out, so its writes are not left waiting for the next full load.
  if (sawLiveTab)
    rescanTimer = setTimeout(() => {
      rescanTimer = null
      if (disposed || !adoptOrphanedQueues().adopted) return

      notify()
      for (const lane of lanes.keys()) pump(lane)
    }, leaseMs + 1_000)

  for (const lane of lanes.keys()) pump(lane)

  return {
    dispose,
    enqueue,
    flushWithKeepalive,
    markReleased,
    pendingCount: () => allItems().length,
    pendingItems: () => allItems().map(item => ({ ...item })),
    release,
    resume,
    subscribe,
    whenIdle,
  }
}
