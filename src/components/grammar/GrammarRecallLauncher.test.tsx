import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OutboxOwnerProvider } from '@/components/common/OutboxOwnerProvider'
import { getClientOutbox } from '@/lib/sync/clientOutbox'

import {
  DUE_QUEUE_IDLE_TIMEOUT_MS,
  DUE_QUEUE_STALE_MS,
  GrammarRecallLauncher,
} from './GrammarRecallLauncher'

/**
 * The modal is not under test here, only when the queue is fetched and that a
 * prefetched queue opens without another request.
 */
vi.mock('./GrammarRecallModal', () => ({
  GrammarRecallModal: ({
    onClose,
    tasks,
  }: {
    onClose: () => void
    tasks: unknown[]
  }) => (
    <div>
      <p>Session with {tasks.length} tasks</p>
      <button
        onClick={onClose}
        type="button"
      >
        Close session
      </button>
    </div>
  ),
}))

const refresh = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

/** Auto-open already happened today, so only the prefetch paths run. */
function stubStorage() {
  const values = new Map<string, string>([
    ['grammar:recall:lastAutoOpenDay', new Date().toISOString().slice(0, 10)],
  ])

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  })
}

function mockDueFetch() {
  const urls: string[] = []
  const fetcher = vi.fn((url: string) => {
    urls.push(url)

    return Promise.resolve({
      json: () => Promise.resolve({ tasks: [{ idempotencyKey: 'k1' }] }),
      ok: true,
      status: 200,
    } as unknown as Response)
  })

  vi.stubGlobal('fetch', fetcher)

  return urls
}

let ownerSeq = 0

function renderLauncher(dueCount: number) {
  ownerSeq += 1

  return render(
    <OutboxOwnerProvider ownerKey={`launcher-owner-${ownerSeq}`}>
      <GrammarRecallLauncher dueCount={dueCount} />
    </OutboxOwnerProvider>
  )
}

describe('GrammarRecallLauncher prefetch', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    stubStorage()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    refresh.mockClear()
  })

  it('prefetches on idle and opens without another request', async () => {
    const urls = mockDueFetch()

    renderLauncher(3)

    await waitFor(() => expect(urls).toEqual(['/api/grammar/recall/due']))

    fireEvent.click(screen.getByRole('button', { name: 'Start Recall' }))

    expect(await screen.findByText('Session with 1 tasks')).toBeTruthy()
    expect(urls).toHaveLength(1)
  })

  it('does not prefetch when nothing is due', async () => {
    const urls = mockDueFetch()

    renderLauncher(0)

    await act(() => new Promise(resolve => setTimeout(resolve, 300)))

    expect(urls).toHaveLength(0)
  })

  it('refetches on hover once the prefetched queue is stale', async () => {
    const urls = mockDueFetch()
    const realNow = Date.now()
    const now = vi.spyOn(Date, 'now').mockReturnValue(realNow)

    renderLauncher(3)

    await waitFor(() => expect(urls).toHaveLength(1))

    // Still fresh: hovering reuses the cached promise.
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Start Recall' }))
    expect(urls).toHaveLength(1)

    now.mockReturnValue(realNow + DUE_QUEUE_STALE_MS + 1)
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Start Recall' }))

    await waitFor(() => expect(urls).toHaveLength(2))
  })

  it('reads a fresh queue after a session', async () => {
    const urls = mockDueFetch()

    renderLauncher(3)

    await waitFor(() => expect(urls).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: 'Start Recall' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Close session' })
    )

    // The idle prefetch runs again for the next session.
    await waitFor(() => expect(urls).toHaveLength(2))

    fireEvent.click(screen.getByRole('button', { name: 'Start Recall' }))

    expect(await screen.findByText('Session with 1 tasks')).toBeTruthy()
    expect(urls).toHaveLength(2)
  })

  it('refreshes the page data once the session answers have landed', async () => {
    mockDueFetch()
    renderLauncher(3)

    fireEvent.click(screen.getByRole('button', { name: 'Start Recall' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Close session' })
    )

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('does not refresh while answers are still queued', async () => {
    mockDueFetch()

    ownerSeq += 1
    const owner = `launcher-owner-${ownerSeq}`

    render(
      <OutboxOwnerProvider ownerKey={owner}>
        <GrammarRecallLauncher dueCount={2} />
      </OutboxOwnerProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start Recall' }))

    const closeButton = await screen.findByRole('button', {
      name: 'Close session',
    })

    vi.spyOn(getClientOutbox(owner), 'whenIdle').mockResolvedValue(false)
    fireEvent.click(closeButton)
    await act(() => new Promise(resolve => setTimeout(resolve, 50)))

    expect(refresh).not.toHaveBeenCalled()
  })

  it('waits for queued answers to land before reading the queue', async () => {
    const urls: string[] = []
    let settleAnswer: () => void = () => {}

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        urls.push(url)

        if (url === '/api/grammar/recall/answer')
          return new Promise<Response>(resolve => {
            settleAnswer = () =>
              resolve({
                json: () => Promise.resolve({}),
                ok: true,
                status: 200,
              } as unknown as Response)
          })

        return Promise.resolve({
          json: () => Promise.resolve({ tasks: [] }),
          ok: true,
          status: 200,
        } as unknown as Response)
      })
    )

    ownerSeq += 1
    const owner = `launcher-owner-${ownerSeq}`

    void getClientOutbox(owner).enqueue({
      body: { idempotencyKey: 'k-in-flight' },
      id: 'k-in-flight',
      lane: 'grammar:recall',
      url: '/api/grammar/recall/answer',
    })

    render(
      <OutboxOwnerProvider ownerKey={owner}>
        <GrammarRecallLauncher dueCount={2} />
      </OutboxOwnerProvider>
    )

    await act(() => new Promise(resolve => setTimeout(resolve, 300)))

    expect(urls).toEqual(['/api/grammar/recall/answer'])

    await act(async () => settleAnswer())

    await waitFor(() =>
      expect(urls).toEqual([
        '/api/grammar/recall/answer',
        '/api/grammar/recall/due',
      ])
    )
  })

  it('reads the queue anyway when the outbox never drains', async () => {
    const urls = mockDueFetch()

    ownerSeq += 1
    const owner = `launcher-owner-${ownerSeq}`
    // Offline or a lane stuck retrying: the wait times out instead of draining.
    const whenIdle = vi
      .spyOn(getClientOutbox(owner), 'whenIdle')
      .mockResolvedValue(false)

    render(
      <OutboxOwnerProvider ownerKey={owner}>
        <GrammarRecallLauncher dueCount={2} />
      </OutboxOwnerProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start Recall' }))

    expect(await screen.findByText('Session with 1 tasks')).toBeTruthy()
    expect(urls).toEqual(['/api/grammar/recall/due'])
    expect(whenIdle).toHaveBeenCalledWith({
      timeoutMs: DUE_QUEUE_IDLE_TIMEOUT_MS,
    })
  })

  it('leaves out points whose answer is still saving when the wait times out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url === '/api/grammar/recall/due'
          ? Promise.resolve({
              json: () =>
                Promise.resolve({
                  tasks: [
                    { idempotencyKey: 'k1', pointSlug: 'saving' },
                    { idempotencyKey: 'k2', pointSlug: 'fresh' },
                  ],
                }),
              ok: true,
              status: 200,
            } as unknown as Response)
          : new Promise<Response>(() => {})
      )
    )

    ownerSeq += 1
    const owner = `launcher-owner-${ownerSeq}`
    const outbox = getClientOutbox(owner)

    void outbox.enqueue({
      body: { idempotencyKey: 'k0', slug: 'saving' },
      id: 'k0',
      lane: 'grammar:recall',
      url: '/api/grammar/recall/answer',
    })
    vi.spyOn(outbox, 'whenIdle').mockResolvedValue(false)

    render(
      <OutboxOwnerProvider ownerKey={owner}>
        <GrammarRecallLauncher dueCount={2} />
      </OutboxOwnerProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start Recall' }))

    expect(await screen.findByText('Session with 1 tasks')).toBeTruthy()
  })
})
