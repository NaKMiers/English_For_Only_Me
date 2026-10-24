import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getOutboxTabStorageKey } from '@/lib/sync/outbox'

type ClientOutboxModule = typeof import('@/lib/sync/clientOutbox')

interface FetchCall {
  init: RequestInit
  resolve: (status: number, data?: unknown) => void
  url: string
}

// Guest identity calls succeed at once; outbox writes wait for the test.
function stubFetch() {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url) === '/api/guest')
      return Promise.resolve(new Response('{}', { status: 200 }))

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

describe('ensureGuestIdentity', () => {
  it('forgets a failed attempt so the next write tries again', async () => {
    const { ensureGuestIdentity } = await loadModule()
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 500 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))

    await expect(ensureGuestIdentity(fetchImpl)).rejects.toThrow(
      'Could not start a guest session.'
    )
    await expect(ensureGuestIdentity(fetchImpl)).resolves.toBeUndefined()
    // Once it worked, the result is shared.
    await expect(ensureGuestIdentity(fetchImpl)).resolves.toBeUndefined()
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
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

  it('moves anonymous writes into the guest queue once the visitor is a guest', async () => {
    const { calls } = stubFetch()
    const { getClientOutbox } = await loadModule()
    const anonymous = getClientOutbox(null)
    const result = anonymous.enqueue({
      body: {},
      id: 'first-answer',
      lane: 'l',
      url: '/answer',
    })

    await flushMicrotasks()
    expect(calls).toHaveLength(1)

    const guest = getClientOutbox('guest-hash', { isGuest: true })

    await flushMicrotasks()
    expect(guest).not.toBe(anonymous)
    expect(guest.pendingCount()).toBe(1)
    expect(anonymous.pendingCount()).toBe(0)
    expect(
      window.localStorage.getItem(
        getOutboxTabStorageKey('anonymous', getTabId())
      )
    ).toBeNull()

    // Re-sent under the guest, with the same idempotency key.
    const resent = calls[1]

    expect(new Headers(resent.init.headers).get('x-outbox-owner')).toBe(
      'guest-hash'
    )
    expect(new Headers(resent.init.headers).get('idempotency-key')).toBe(
      'first-answer'
    )

    resent.resolve(200, { saved: true })
    await expect(result).resolves.toMatchObject({
      data: { saved: true },
      ok: true,
    })
  })

  it('adopts an anonymous queue left in storage by an earlier load', async () => {
    stubFetch()

    const first = await loadModule()

    void first
      .getClientOutbox(null)
      .enqueue({ body: {}, id: 'stored', lane: 'l', url: '/a' })
    await flushMicrotasks()

    // A reload in the same tab, now with a guest cookie. The old page fires
    // pagehide before the new one runs.
    window.dispatchEvent(new Event('pagehide'))
    await flushMicrotasks()

    const { calls } = stubFetch()
    const second = await loadModule()
    const guest = second.getClientOutbox('guest-hash', { isGuest: true })

    await flushMicrotasks()
    expect(guest.pendingCount()).toBe(1)
    expect(calls.map(call => call.url)).toEqual(['/a'])
  })

  it('does not hand anonymous writes to a signed-in user', async () => {
    stubFetch()

    const { getClientOutbox } = await loadModule()

    void getClientOutbox(null).enqueue({ body: {}, lane: 'l', url: '/a' })
    await flushMicrotasks()

    const user = getClientOutbox('user-hash', { isGuest: false })

    expect(user.pendingCount()).toBe(0)
    expect(
      window.localStorage.getItem(
        getOutboxTabStorageKey('anonymous', getTabId())
      )
    ).not.toBeNull()
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
