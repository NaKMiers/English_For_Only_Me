import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getOutboxTabStorageKey } from '@/lib/sync/outbox'

type ClientOutboxModule = typeof import('@/lib/sync/clientOutbox')

interface FetchCall {
  init: RequestInit
  resolve: (status: number, data?: unknown) => void
  url: string
}

// Outbox writes wait for the test to answer them.
function stubFetch() {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>(resolve => {
      calls.push({
        init: init ?? {},
        resolve: (status, data = {}) =>
          resolve(new Response(JSON.stringify(data), { status })),
        url: String(url),
      })
    })
  })

  vi.stubGlobal('fetch', fetchMock)

  return { calls, fetchMock }
}

async function flushMicrotasks() {
  for (let index = 0; index < 20; index += 1) await Promise.resolve()
}

async function loadModule(): Promise<ClientOutboxModule> {
  vi.resetModules()

  return import('@/lib/sync/clientOutbox')
}

function getTabId() {
  return window.sessionStorage.getItem('efom.outbox.tab') ?? ''
}

// Node's own (disabled) localStorage shadows jsdom's, so install real ones.
function createMemoryStorage(): Storage {
  const data = new Map<string, string>()

  return {
    clear: () => data.clear(),
    getItem: key => data.get(key) ?? null,
    key: index => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
    removeItem: key => {
      data.delete(key)
    },
    setItem: (key, value) => {
      data.set(key, String(value))
    },
  }
}

beforeEach(() => {
  for (const name of ['localStorage', 'sessionStorage'])
    Object.defineProperty(window, name, {
      configurable: true,
      value: createMemoryStorage(),
    })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('getClientOutbox', () => {
  it('never caches during server rendering', async () => {
    const { getClientOutbox } = await loadModule()

    vi.stubGlobal('window', undefined)

    expect(getClientOutbox('hash-a')).not.toBe(getClientOutbox('hash-a'))
  })

  it('shares one outbox per owner in a tab and keeps the tab id', async () => {
    stubFetch()

    const { getClientOutbox } = await loadModule()
    const outbox = getClientOutbox('hash-a')

    expect(getClientOutbox('hash-a')).toBe(outbox)
    expect(getTabId()).not.toBe('')
  })

  it('stores writes under this tab and sends the owner key header', async () => {
    const { calls } = stubFetch()
    const { getClientOutbox } = await loadModule()

    void getClientOutbox('hash-a').enqueue({ body: {}, lane: 'l', url: '/a' })
    await flushMicrotasks()

    expect(
      window.localStorage.getItem(getOutboxTabStorageKey('hash-a', getTabId()))
    ).not.toBeNull()
    expect(new Headers(calls[0].init.headers).get('x-outbox-owner')).toBe(
      'hash-a'
    )
  })

  it('holds the write on a 401 and sends the tab to sign in, once', async () => {
    const { calls } = stubFetch()
    const assign = vi.fn()

    vi.stubGlobal('location', {
      ...window.location,
      assign,
      pathname: '/grammar/lessons/u01-l01',
      search: '?step=3',
    })

    const { getClientOutbox } = await loadModule()
    const outbox = getClientOutbox('hash-a')
    const flush = vi.spyOn(outbox, 'flushWithKeepalive')

    void outbox.enqueue({ body: {}, id: 'a1', lane: 'a', url: '/a1' })
    void outbox.enqueue({ body: {}, id: 'b1', lane: 'b', url: '/b1' })
    await flushMicrotasks()
    calls[0].resolve(401)
    calls[1].resolve(401)
    await flushMicrotasks()

    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith(
      '/auth/login?callbackUrl=%2Fgrammar%2Flessons%2Fu01-l01%3Fstep%3D3'
    )
    expect(outbox.pendingCount()).toBe(2)

    // Leaving for the login page resends nothing: it would only meet a 401.
    window.dispatchEvent(new Event('pagehide'))
    expect(flush).not.toHaveBeenCalled()

    // The stored queue is released, so the next load takes it over at once.
    const stored = JSON.parse(
      window.localStorage.getItem(
        getOutboxTabStorageKey('hash-a', getTabId())
      ) ?? '{}'
    ) as { heartbeatAt: number; items: Array<{ id: string }> }

    expect(stored.heartbeatAt).toBe(0)
    expect(stored.items.map(item => item.id)).toEqual(['a1', 'b1'])
  })

  it('replays the held write after signing back in as the same learner', async () => {
    const before = stubFetch()

    vi.stubGlobal('location', { ...window.location, assign: vi.fn() })

    const first = await loadModule()

    void first
      .getClientOutbox('hash-a')
      .enqueue({ body: { n: 1 }, id: 'a1', lane: 'l', url: '/a1' })
    await flushMicrotasks()
    before.calls[0].resolve(401)
    await flushMicrotasks()
    // The tab leaves for the login page.
    window.dispatchEvent(new Event('pagehide'))

    // Back as the same Google account: the same owner key.
    const after = stubFetch()
    const second = await loadModule()
    const replayed = second.getClientOutbox('hash-a')

    await flushMicrotasks()
    expect(replayed.pendingCount()).toBe(1)
    expect(after.calls.map(call => call.url)).toEqual(['/a1'])
    expect(
      new Headers(after.calls[0].init.headers).get('idempotency-key')
    ).toBe('a1')
  })

  it('never sends the held write as another learner', async () => {
    const before = stubFetch()

    vi.stubGlobal('location', { ...window.location, assign: vi.fn() })

    const first = await loadModule()

    void first
      .getClientOutbox('hash-a')
      .enqueue({ body: {}, id: 'a1', lane: 'l', url: '/a1' })
    await flushMicrotasks()
    before.calls[0].resolve(401)
    await flushMicrotasks()
    window.dispatchEvent(new Event('pagehide'))

    const after = stubFetch()
    const second = await loadModule()

    expect(second.getClientOutbox('hash-b').pendingCount()).toBe(0)
    await flushMicrotasks()
    expect(after.calls).toHaveLength(0)
  })

  it('disposes the previous owner on a switch and keeps its queue stored', async () => {
    const { calls } = stubFetch()
    const { getClientOutbox } = await loadModule()
    const userA = getClientOutbox('hash-a')

    void userA.enqueue({ body: {}, lane: 'l', url: '/a' })
    await flushMicrotasks()

    const userB = getClientOutbox('hash-b')
    const flushA = vi.spyOn(userA, 'flushWithKeepalive')
    const flushB = vi.spyOn(userB, 'flushWithKeepalive')

    expect(userB).not.toBe(userA)
    expect(userB.pendingCount()).toBe(0)

    // Only the current owner's outbox still listens for pagehide.
    window.dispatchEvent(new Event('pagehide'))
    expect(flushA).not.toHaveBeenCalled()
    expect(flushB).toHaveBeenCalledTimes(1)

    // A's queue waits in storage for A, and A's late response does nothing.
    calls[0].resolve(503)
    await flushMicrotasks()
    expect(
      window.localStorage.getItem(getOutboxTabStorageKey('hash-a', getTabId()))
    ).not.toBeNull()

    const userAAgain = getClientOutbox('hash-a')

    expect(userAAgain).not.toBe(userA)
    expect(userAAgain.pendingCount()).toBe(1)
  })
})

describe('tab id', () => {
  it('keeps the tab id across a reload', async () => {
    stubFetch()
    ;(await loadModule()).getClientOutbox('hash-a')

    const before = getTabId()

    window.dispatchEvent(new Event('pagehide'))
    ;(await loadModule()).getClientOutbox('hash-a')

    expect(getTabId()).toBe(before)
  })

  it('gives a duplicated tab its own id while the original is open', async () => {
    stubFetch()
    ;(await loadModule()).getClientOutbox('hash-a')

    const original = getTabId()

    // Duplicating copies sessionStorage; the original page never unloaded.
    ;(await loadModule()).getClientOutbox('hash-a')

    expect(getTabId()).not.toBe(original)
    expect(getTabId()).not.toBe('')
  })

  it('cleans up claims left by tabs that died without pagehide', async () => {
    stubFetch()

    const { TAB_CLAIM_TTL_MS } = await loadModule()

    window.localStorage.setItem(
      'efom.outbox.tab-claim.dead-tab',
      JSON.stringify({ at: Date.now() - TAB_CLAIM_TTL_MS - 1, pageId: 'gone' })
    )
    ;(await loadModule()).getClientOutbox('hash-a')

    expect(
      window.localStorage.getItem('efom.outbox.tab-claim.dead-tab')
    ).toBeNull()
    expect(
      window.localStorage.getItem(`efom.outbox.tab-claim.${getTabId()}`)
    ).not.toBeNull()
  })

  it('reuses a copied id whose page stopped claiming it long ago', async () => {
    stubFetch()

    const { TAB_CLAIM_TTL_MS } = await loadModule()

    window.sessionStorage.setItem('efom.outbox.tab', 'old-tab')
    window.localStorage.setItem(
      'efom.outbox.tab-claim.old-tab',
      JSON.stringify({ at: Date.now() - TAB_CLAIM_TTL_MS - 1, pageId: 'gone' })
    )
    ;(await loadModule()).getClientOutbox('hash-a')

    expect(getTabId()).toBe('old-tab')
  })
})
