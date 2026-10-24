import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createOutbox,
  getOutboxStorageKey,
  MAX_SERVER_ERROR_ATTEMPTS,
  getOutboxTabStorageKey,
  type OutboxItem,
  type OutboxStorage,
} from '@/lib/sync/outbox'

// A fetch double whose responses the test releases one at a time, so ordering
// and in-flight behaviour can be asserted deterministically.
function createControlledFetch() {
  const calls: Array<{
    body: unknown
    init: RequestInit
    resolve: (status: number, data?: unknown) => void
    reject: (error: Error) => void
    url: string
  }> = []
  const fetchImpl = vi.fn(
    (url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((resolve, reject) => {
        calls.push({
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          init: init ?? {},
          reject,
          resolve: (status, data = {}) =>
            resolve(new Response(JSON.stringify(data), { status })),
          url: String(url),
        })
      })
  )

  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch }
}

function createMemoryStorage(): OutboxStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()

  return {
    data,
    getItem: key => data.get(key) ?? null,
    key: index => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
    removeItem: key => {
      data.delete(key)
    },
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

function createStoredItem(overrides: Partial<OutboxItem> = {}): OutboxItem {
  return {
    attempts: 0,
    body: {},
    createdAt: Date.now(),
    id: 'item',
    lane: 'l',
    mergeKey: null,
    method: 'POST',
    owner: 'user-a',
    url: '/item',
    ...overrides,
  }
}

function readItemIds(storage: OutboxStorage, key: string) {
  const parsed = JSON.parse(storage.getItem(key) ?? '{"items":[]}') as {
    items: OutboxItem[]
  }

  return parsed.items.map(item => item.id)
}

async function flushMicrotasks() {
  for (let index = 0; index < 20; index += 1) await Promise.resolve()
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createOutbox', () => {
  it('sends one item per lane at a time, in enqueue order', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({ fetchImpl, owner: 'user-a' })

    void outbox.enqueue({ body: { n: 1 }, lane: 'session', url: '/a' })
    void outbox.enqueue({ body: { n: 2 }, lane: 'session', url: '/b' })
    await flushMicrotasks()

    expect(calls.map(call => call.url)).toEqual(['/a'])

    calls[0].resolve(200)
    await flushMicrotasks()

    expect(calls.map(call => call.url)).toEqual(['/a', '/b'])
  })

  it('runs separate lanes in parallel', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({ fetchImpl, owner: 'user-a' })

    void outbox.enqueue({ body: {}, lane: 'one', url: '/a' })
    void outbox.enqueue({ body: {}, lane: 'two', url: '/b' })
    await flushMicrotasks()

    expect(calls.map(call => call.url).sort()).toEqual(['/a', '/b'])
  })

  it('merges a queued write with the same mergeKey and supersedes it', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({ fetchImpl, owner: 'user-a' })

    void outbox.enqueue({ body: { n: 0 }, lane: 'l', url: '/first' })
    const superseded = outbox.enqueue({
      body: { cursor: 1 },
      lane: 'l',
      mergeKey: 'cursor',
      url: '/cursor',
    })
    void outbox.enqueue({
      body: { cursor: 2 },
      lane: 'l',
      mergeKey: 'cursor',
      url: '/cursor',
    })

    await expect(superseded).resolves.toMatchObject({
      data: { superseded: true },
      ok: true,
    })
    expect(outbox.pendingCount()).toBe(2)

    calls[0].resolve(200)
    await flushMicrotasks()

    expect(calls[1].body).toEqual({ cursor: 2 })
  })

  it('never merges into the write that is already in flight', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({ fetchImpl, owner: 'user-a' })

    void outbox.enqueue({
      body: { cursor: 1 },
      lane: 'l',
      mergeKey: 'cursor',
      url: '/cursor',
    })
    await flushMicrotasks()
    void outbox.enqueue({
      body: { cursor: 2 },
      lane: 'l',
      mergeKey: 'cursor',
      url: '/cursor',
    })

    expect(outbox.pendingCount()).toBe(2)

    calls[0].resolve(200)
    await flushMicrotasks()

    expect(calls[1].body).toEqual({ cursor: 2 })
  })

  it('retries network errors and 5xx with backoff, keeping order', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl,
      owner: 'user-a',
      retryBaseDelayMs: 100,
    })
    const result = outbox.enqueue({ body: {}, lane: 'l', url: '/a' })

    void outbox.enqueue({ body: {}, lane: 'l', url: '/b' })
    await flushMicrotasks()
    calls[0].reject(new Error('offline'))
    await flushMicrotasks()

    expect(calls).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(100)
    expect(calls.map(call => call.url)).toEqual(['/a', '/a'])

    calls[1].resolve(503)
    await flushMicrotasks()
    await vi.advanceTimersByTimeAsync(200)
    calls[2].resolve(201, { saved: true })

    await expect(result).resolves.toEqual({
      data: { saved: true },
      ok: true,
      status: 201,
    })
    await flushMicrotasks()
    expect(calls[3].url).toBe('/b')
  })

  it('settles 4xx as a failure without retrying so the caller can roll back', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const onSettled = vi.fn()
    const outbox = createOutbox({ fetchImpl, onSettled, owner: 'user-a' })
    const result = outbox.enqueue({ body: {}, lane: 'l', url: '/a' })

    await flushMicrotasks()
    calls[0].resolve(409, { message: 'Not the current segment.' })

    await expect(result).resolves.toEqual({
      error: 'Not the current segment.',
      ok: false,
      status: 409,
    })
    expect(onSettled).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toHaveLength(1)
  })

  it('persists queued items per owner and replays them on the next load', async () => {
    const storage = createMemoryStorage()
    const first = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl: first.fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-1',
    })

    void outbox.enqueue({
      body: { idempotencyKey: 'k1' },
      id: 'k1',
      lane: 'l',
      url: '/a',
    })
    await flushMicrotasks()
    outbox.dispose()

    expect(storage.data.has(getOutboxTabStorageKey('user-a', 'tab-1'))).toBe(
      true
    )

    const second = createControlledFetch()

    // A reload keeps the tab id, so the queue is picked up at once.
    createOutbox({
      fetchImpl: second.fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-1',
    })
    await flushMicrotasks()

    expect(second.calls).toHaveLength(1)
    expect(second.calls[0].body).toEqual({ idempotencyKey: 'k1' })
    expect(
      new Headers(second.calls[0].init.headers).get('idempotency-key')
    ).toBe('k1')

    second.calls[0].resolve(200)
    await flushMicrotasks()
    expect(storage.data.size).toBe(0)
  })

  it('never replays another owner queue', async () => {
    const storage = createMemoryStorage()
    const first = createControlledFetch()

    const outbox = createOutbox({
      fetchImpl: first.fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-1',
    })

    void outbox.enqueue({ body: {}, lane: 'l', url: '/a' })
    await flushMicrotasks()
    outbox.dispose()
    // Even once the tab is long gone, another learner never adopts it.
    await vi.advanceTimersByTimeAsync(120_000)

    const second = createControlledFetch()

    createOutbox({
      fetchImpl: second.fetchImpl,
      owner: 'user-b',
      storage,
      tabId: 'tab-1',
    })
    await flushMicrotasks()

    expect(second.calls).toHaveLength(0)
    expect(storage.data.has(getOutboxTabStorageKey('user-a', 'tab-1'))).toBe(
      true
    )
  })

  it('keeps the same idempotency key across a replay so the server dedupes', async () => {
    const storage = createMemoryStorage()
    const first = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl: first.fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-1',
    })

    void outbox.enqueue({ body: {}, lane: 'l', url: '/a' })
    await flushMicrotasks()

    const firstKey = new Headers(first.calls[0].init.headers).get(
      'idempotency-key'
    )

    outbox.dispose()

    const second = createControlledFetch()

    createOutbox({
      fetchImpl: second.fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-1',
    })
    await flushMicrotasks()

    expect(
      new Headers(second.calls[0].init.headers).get('idempotency-key')
    ).toBe(firstKey)
  })

  it('keepalive-sends only the head of each lane, in-flight heads included on unload', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl,
      keepaliveBudgetBytes: 30,
      owner: 'user-a',
    })

    void outbox.enqueue({ body: { a: 1 }, lane: 'busy', url: '/busy' })
    await flushMicrotasks()
    void outbox.enqueue({ body: { a: 2 }, lane: 'busy', url: '/busy-2' })
    void outbox.enqueue({ body: { b: 'x'.repeat(5) }, lane: 'one', url: '/1' })
    void outbox.enqueue({ body: { c: 'y'.repeat(40) }, lane: 'two', url: '/2' })
    calls.length = 0

    outbox.flushWithKeepalive({ includeInFlight: true })

    const keepalive = calls.filter(call => call.init.keepalive)

    expect(keepalive.map(call => call.url)).toEqual(['/busy', '/1'])

    // Only hidden: every head here is still in flight and keeps running, so
    // nothing is sent again to race it.
    calls.length = 0
    outbox.flushWithKeepalive()
    expect(calls).toHaveLength(0)
    expect(new Headers(keepalive[0].init.headers).get('x-outbox-owner')).toBe(
      'user-a'
    )
  })

  it('sends the owner key header with every write', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({ fetchImpl, owner: 'hash-a' })

    void outbox.enqueue({ body: {}, lane: 'l', url: '/a' })
    await flushMicrotasks()

    expect(new Headers(calls[0].init.headers).get('x-outbox-owner')).toBe(
      'hash-a'
    )
  })

  it('resolves whenIdle(true) only after every lane drains', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({ fetchImpl, owner: 'user-a' })
    const idle = vi.fn()

    void outbox.enqueue({ body: {}, lane: 'one', url: '/a' })
    void outbox.enqueue({ body: {}, lane: 'two', url: '/b' })
    void outbox.whenIdle().then(idle)
    await flushMicrotasks()

    calls[0].resolve(200)
    await flushMicrotasks()
    expect(idle).not.toHaveBeenCalled()

    calls[1].resolve(200)
    await flushMicrotasks()
    expect(idle).toHaveBeenCalledWith(true)
    await expect(outbox.whenIdle()).resolves.toBe(true)
  })

  it('resolves whenIdle(false) on timeout while an item keeps retrying', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    const outbox = createOutbox({
      fetchImpl,
      maxRetryDelayMs: 1_000,
      owner: 'user-a',
      retryBaseDelayMs: 100,
    })

    void outbox.enqueue({ body: {}, lane: 'l', url: '/a' })

    const idle = outbox.whenIdle({ timeoutMs: 8_000 })

    await vi.advanceTimersByTimeAsync(8_000)
    await expect(idle).resolves.toBe(false)
    // Still queued and still retrying: offline must never drop a write.
    expect(outbox.pendingCount()).toBe(1)

    const callsBefore = vi.mocked(fetchImpl).mock.calls.length

    await vi.advanceTimersByTimeAsync(10_000)
    // Backoff is capped at 1s, so ten seconds is about ten more tries.
    expect(
      vi.mocked(fetchImpl).mock.calls.length - callsBefore
    ).toBeGreaterThanOrEqual(9)
    outbox.dispose()
  })

  it('resolves pending whenIdle(false) when disposed', async () => {
    const { fetchImpl } = createControlledFetch()
    const outbox = createOutbox({ fetchImpl, owner: 'user-a' })

    void outbox.enqueue({ body: {}, lane: 'l', url: '/a' })

    const idle = outbox.whenIdle()

    outbox.dispose()
    await expect(idle).resolves.toBe(false)
  })

  it('drops stored items older than a week', async () => {
    const storage = createMemoryStorage()

    storage.setItem(
      getOutboxStorageKey('user-a'),
      JSON.stringify([
        {
          attempts: 0,
          body: {},
          createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
          id: 'old',
          lane: 'l',
          mergeKey: null,
          method: 'POST',
          owner: 'user-a',
          url: '/old',
        },
      ])
    )

    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({ fetchImpl, owner: 'user-a', storage })

    await flushMicrotasks()
    expect(calls).toHaveLength(0)
    expect(outbox.pendingCount()).toBe(0)
  })

  it('ignores a corrupt stored queue', () => {
    const storage = createMemoryStorage()

    storage.setItem(getOutboxStorageKey('user-a'), '{not json')

    expect(() =>
      createOutbox({ owner: 'user-a', storage }).pendingCount()
    ).not.toThrow()
  })
  it('keeps two live tabs from overwriting each other', async () => {
    const storage = createMemoryStorage()
    const tabOne = createOutbox({
      fetchImpl: createControlledFetch().fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-1',
    })
    const tabTwo = createOutbox({
      fetchImpl: createControlledFetch().fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-2',
    })

    void tabOne.enqueue({ body: {}, id: 'one', lane: 'l', url: '/a' })
    void tabTwo.enqueue({ body: {}, id: 'two', lane: 'l', url: '/b' })
    await flushMicrotasks()

    expect(
      readItemIds(storage, getOutboxTabStorageKey('user-a', 'tab-1'))
    ).toEqual(['one'])
    expect(
      readItemIds(storage, getOutboxTabStorageKey('user-a', 'tab-2'))
    ).toEqual(['two'])
  })

  it('adopts the queue of a tab whose heartbeat went stale', async () => {
    const storage = createMemoryStorage()
    const closed = createOutbox({
      fetchImpl: createControlledFetch().fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-closed',
    })

    void closed.enqueue({ body: {}, id: 'orphan', lane: 'l', url: '/old' })
    await flushMicrotasks()
    closed.dispose()
    await vi.advanceTimersByTimeAsync(151_000)

    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-new',
    })

    await flushMicrotasks()
    expect(calls.map(call => call.url)).toEqual(['/old'])
    expect(
      storage.data.has(getOutboxTabStorageKey('user-a', 'tab-closed'))
    ).toBe(false)
    expect(
      readItemIds(storage, getOutboxTabStorageKey('user-a', 'tab-new'))
    ).toEqual(['orphan'])
    outbox.dispose()
  })

  it('leaves a live tab queue alone, then adopts it once that tab dies', async () => {
    const storage = createMemoryStorage()
    const live = createOutbox({
      fetchImpl: createControlledFetch().fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-live',
    })

    void live.enqueue({ body: {}, id: 'live-item', lane: 'l', url: '/live' })
    await flushMicrotasks()

    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-new',
    })

    await flushMicrotasks()
    // The live tab heartbeats, so a minute later it is still its own.
    await vi.advanceTimersByTimeAsync(60_000)
    expect(calls).toHaveLength(0)
    expect(storage.data.has(getOutboxTabStorageKey('user-a', 'tab-live'))).toBe(
      true
    )

    live.dispose()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(calls).toHaveLength(0)

    // A fresh start after the lease ran out does adopt it.
    outbox.dispose()
    await vi.advanceTimersByTimeAsync(120_000)

    const later = createControlledFetch()

    createOutbox({
      fetchImpl: later.fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-new',
    })
    await flushMicrotasks()
    expect(later.calls.map(call => call.url)).toEqual(['/live'])
  })

  it('looks again after the lease when a tab closed just before startup', async () => {
    const storage = createMemoryStorage()
    const closing = createOutbox({
      fetchImpl: createControlledFetch().fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-closing',
    })

    void closing.enqueue({ body: {}, id: 'late', lane: 'l', url: '/late' })
    await flushMicrotasks()
    closing.dispose()

    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-new',
    })

    await flushMicrotasks()
    expect(calls).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(152_000)
    expect(calls.map(call => call.url)).toEqual(['/late'])
    outbox.dispose()
  })

  it('migrates the legacy single-key queue once', async () => {
    const storage = createMemoryStorage()

    storage.setItem(
      getOutboxStorageKey('user-a'),
      JSON.stringify([createStoredItem({ id: 'legacy', url: '/legacy' })])
    )

    const { calls, fetchImpl } = createControlledFetch()

    createOutbox({ fetchImpl, owner: 'user-a', storage, tabId: 'tab-1' })
    await flushMicrotasks()

    expect(calls.map(call => call.url)).toEqual(['/legacy'])
    expect(storage.data.has(getOutboxStorageKey('user-a'))).toBe(false)
    expect(
      readItemIds(storage, getOutboxTabStorageKey('user-a', 'tab-1'))
    ).toEqual(['legacy'])
  })

  it('adopts another owner queue it is told to, re-owned and ahead of its own', async () => {
    const storage = createMemoryStorage()

    storage.setItem(
      getOutboxTabStorageKey('anonymous', 'tab-1'),
      JSON.stringify({
        heartbeatAt: Date.now(),
        items: [
          createStoredItem({ id: 'anon', owner: 'anonymous', url: '/anon' }),
        ],
      })
    )
    storage.setItem(
      getOutboxTabStorageKey('anonymous', 'tab-other'),
      JSON.stringify({
        heartbeatAt: Date.now(),
        items: [createStoredItem({ id: 'other', owner: 'anonymous' })],
      })
    )

    const { calls, fetchImpl } = createControlledFetch()

    createOutbox({
      adoptOwners: ['anonymous'],
      fetchImpl,
      owner: 'guest-hash',
      storage,
      tabId: 'tab-1',
    })
    await flushMicrotasks()

    expect(calls.map(call => call.url)).toEqual(['/anon'])
    expect(new Headers(calls[0].init.headers).get('x-outbox-owner')).toBe(
      'guest-hash'
    )
    expect(storage.data.has(getOutboxTabStorageKey('anonymous', 'tab-1'))).toBe(
      false
    )
    // Another tab that is still anonymous and alive keeps its own queue.
    expect(
      storage.data.has(getOutboxTabStorageKey('anonymous', 'tab-other'))
    ).toBe(true)

    const stored = JSON.parse(
      storage.getItem(getOutboxTabStorageKey('guest-hash', 'tab-1')) ?? '{}'
    ) as { items: OutboxItem[] }

    expect(stored.items.map(item => item.owner)).toEqual(['guest-hash'])
  })

  it('hands queued items and their callers to another outbox on release', async () => {
    const storage = createMemoryStorage()
    const first = createControlledFetch()
    const anonymous = createOutbox({
      fetchImpl: first.fetchImpl,
      owner: 'anonymous',
      storage,
      tabId: 'tab-1',
    })
    const inFlight = anonymous.enqueue({
      body: {},
      id: 'a1',
      lane: 'l',
      url: '/a1',
    })
    const queued = anonymous.enqueue({
      body: {},
      id: 'a2',
      lane: 'l',
      url: '/a2',
    })

    await flushMicrotasks()

    const released = anonymous.release()

    expect(released.map(entry => entry.item.id)).toEqual(['a1', 'a2'])
    expect(storage.data.has(getOutboxTabStorageKey('anonymous', 'tab-1'))).toBe(
      false
    )

    const second = createControlledFetch()
    const guest = createOutbox({
      adoptItems: released,
      fetchImpl: second.fetchImpl,
      owner: 'guest-hash',
      storage,
      tabId: 'tab-1',
    })

    guest.enqueue({ body: {}, id: 'g1', lane: 'l', url: '/g1' })
    await flushMicrotasks()
    expect(second.calls.map(call => call.url)).toEqual(['/a1'])

    second.calls[0].resolve(200, { n: 1 })
    await expect(inFlight).resolves.toMatchObject({ data: { n: 1 }, ok: true })
    await flushMicrotasks()
    second.calls[1].resolve(200, { n: 2 })
    await expect(queued).resolves.toMatchObject({ data: { n: 2 }, ok: true })
    await flushMicrotasks()
    expect(second.calls.map(call => call.url)).toEqual(['/a1', '/a2', '/g1'])
    // The old request finishing late changes nothing.
    first.calls[0].resolve(200)
    await flushMicrotasks()
    expect(guest.pendingCount()).toBe(1)
  })

  it('lets a new tab take a released queue at once', async () => {
    const storage = createMemoryStorage()
    const closing = createOutbox({
      fetchImpl: createControlledFetch().fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-closing',
    })

    void closing.enqueue({ body: {}, id: 'gone', lane: 'l', url: '/gone' })
    await flushMicrotasks()
    // pagehide: no waiting out the lease.
    closing.markReleased()
    closing.dispose()

    const { calls, fetchImpl } = createControlledFetch()

    createOutbox({ fetchImpl, owner: 'user-a', storage, tabId: 'tab-new' })
    await flushMicrotasks()

    expect(calls.map(call => call.url)).toEqual(['/gone'])
  })

  it('hands over queued items another tab adopted while this one was frozen', async () => {
    const storage = createMemoryStorage()
    const frozen = createControlledFetch()
    const tabA = createOutbox({
      fetchImpl: frozen.fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-a',
    })

    const head = tabA.enqueue({ body: {}, id: 'a1', lane: 'l', url: '/a1' })
    const queued = tabA.enqueue({
      body: { status: 'old' },
      id: 'a2',
      lane: 'l',
      mergeKey: 'status',
      url: '/a2',
    })

    await flushMicrotasks()

    // Tab A stops heartbeating (frozen) and tab B adopts its queue.
    const key = getOutboxTabStorageKey('user-a', 'tab-a')
    const stored = JSON.parse(storage.getItem(key) ?? '{}')

    storage.setItem(key, JSON.stringify({ ...stored, heartbeatAt: 0 }))

    const tabB = createControlledFetch()

    createOutbox({
      fetchImpl: tabB.fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-b',
    })
    await flushMicrotasks()
    expect(storage.data.has(key)).toBe(false)

    // Tab A wakes up: its in-flight head settles, and the adopted item is
    // left to tab B instead of being sent a second time.
    frozen.calls[0].resolve(200)
    await expect(head).resolves.toMatchObject({ ok: true })
    await expect(queued).resolves.toMatchObject({
      data: { superseded: true },
    })
    await flushMicrotasks()

    expect(frozen.calls.map(call => call.url)).toEqual(['/a1'])
    expect(tabA.pendingCount()).toBe(0)
  })

  it('gives up on an item the server keeps failing, but never on network errors', async () => {
    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl,
      maxRetryDelayMs: 10,
      owner: 'user-a',
      retryBaseDelayMs: 1,
    })
    const result = outbox.enqueue({ body: {}, lane: 'l', url: '/broken' })

    for (let index = 0; index < 5; index += 1) {
      await flushMicrotasks()
      calls.at(-1)?.reject(new Error('offline'))
      await vi.advanceTimersByTimeAsync(20)
    }

    for (let index = 0; index < MAX_SERVER_ERROR_ATTEMPTS; index += 1) {
      await flushMicrotasks()
      calls.at(-1)?.resolve(500, { message: 'Broken.' })
      await vi.advanceTimersByTimeAsync(20)
    }

    await expect(result).resolves.toMatchObject({ ok: false, status: 500 })
    expect(calls).toHaveLength(5 + MAX_SERVER_ERROR_ATTEMPTS)
    expect(outbox.pendingCount()).toBe(0)
  })

  it('does not let a late-adopted write undo a state this page set since', async () => {
    const storage = createMemoryStorage()
    const closing = createOutbox({
      fetchImpl: createControlledFetch().fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-closing',
    })

    void closing.enqueue({
      body: { status: 'old' },
      id: 'old',
      lane: 'items',
      mergeKey: 'item:1',
      url: '/status',
    })
    await flushMicrotasks()
    closing.dispose()

    const { calls, fetchImpl } = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-new',
    })

    void outbox.enqueue({
      body: { status: 'new' },
      id: 'new',
      lane: 'items',
      mergeKey: 'item:1',
      url: '/status',
    })
    await flushMicrotasks()
    calls[0].resolve(200)

    // The closing tab's lease runs out and the rescan finds its queue.
    await vi.advanceTimersByTimeAsync(152_000)

    expect(calls.map(call => (call.body as { status: string }).status)).toEqual(
      ['new']
    )
    expect(outbox.pendingCount()).toBe(0)
  })

  it('drops a stored set-state write once it is half a day old', async () => {
    const storage = createMemoryStorage()

    storage.setItem(
      getOutboxTabStorageKey('user-a', 'tab-1'),
      JSON.stringify({
        heartbeatAt: Date.now(),
        items: [
          createStoredItem({
            createdAt: Date.now() - 13 * 60 * 60 * 1000,
            id: 'cursor',
            mergeKey: 'cursor',
            url: '/cursor',
          }),
          createStoredItem({
            createdAt: Date.now() - 13 * 60 * 60 * 1000,
            id: 'attempt',
            lane: 'other',
            url: '/attempt',
          }),
        ],
      })
    )

    const { calls, fetchImpl } = createControlledFetch()

    createOutbox({ fetchImpl, owner: 'user-a', storage, tabId: 'tab-1' })
    await flushMicrotasks()

    expect(calls.map(call => call.url)).toEqual(['/attempt'])
  })

  it('tells waiting callers on dispose and refuses writes afterwards', async () => {
    const storage = createMemoryStorage()
    const { fetchImpl } = createControlledFetch()
    const outbox = createOutbox({
      fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-1',
    })
    const pending = outbox.enqueue({ body: {}, lane: 'l', url: '/a' })

    await flushMicrotasks()
    outbox.dispose()

    await expect(pending).resolves.toMatchObject({ ok: false, status: 0 })
    await expect(
      outbox.enqueue({ body: {}, lane: 'l', url: '/b' })
    ).resolves.toMatchObject({ ok: false, status: 0 })
    // The undelivered write stays stored for this owner's next load.
    expect(
      readItemIds(storage, getOutboxTabStorageKey('user-a', 'tab-1'))
    ).toHaveLength(1)
  })

  it('keeps another tab queue in storage when it cannot store the adopted copy', async () => {
    const storage = createMemoryStorage()
    const orphanKey = getOutboxTabStorageKey('user-a', 'tab-gone')

    storage.setItem(
      orphanKey,
      JSON.stringify({
        heartbeatAt: 0,
        items: [createStoredItem({ id: 'orphan' })],
      })
    )

    const setItem = storage.setItem

    storage.setItem = (key, value) => {
      if (key.endsWith('.tab-new')) throw new Error('QuotaExceededError')
      setItem(key, value)
    }

    createOutbox({
      fetchImpl: createControlledFetch().fetchImpl,
      owner: 'user-a',
      storage,
      tabId: 'tab-new',
    })
    await flushMicrotasks()

    expect(storage.data.has(orphanKey)).toBe(true)
  })
})
