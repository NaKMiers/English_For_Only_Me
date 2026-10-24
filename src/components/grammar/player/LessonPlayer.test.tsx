import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OutboxOwnerProvider } from '@/components/common/OutboxOwnerProvider'
import { GRAMMAR_SESSIONS_URL } from '@/modules/grammar/constants'
import type { GrammarCard } from '@/modules/grammar/course/types'
import type { GrammarSessionResult } from '@/modules/grammar/session/planGrammarSessionWrite'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'

import { LessonPlayer } from './LessonPlayer'

const push = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}))

const cards: GrammarCard[] = [
  {
    kind: 'explain',
    id: 'u01-l01-c01',
    title: 'Ghi nhớ',
    body: 'b',
    examples: [],
  },
  {
    kind: 'choice',
    id: 'u01-l01-c02',
    prompt: 'Chọn từ đúng',
    options: ['am', 'is'],
    answer: 0,
    explain: 'I đi với am.',
  },
]
const plays: PlayCard[] = cards.map(card => ({ card }))

const savedResult: GrammarSessionResult = {
  accuracy: 1,
  correctCount: 1,
  mode: 'lesson',
  passed: true,
  results: [{ cardId: 'u01-l01-c02', correct: true, expected: 'am' }],
  stars: 3,
  targetId: 'u01-l01',
  testOut: false,
  total: 1,
  unlocked: { kind: 'lesson', lessonId: 'u01-l02', title: 'Bài hai' },
}

// The tab-wide outbox is a module singleton: a new owner per test retires the
// previous test's outbox, so nothing it queued leaks into the next one.
let ownerCount = 0

function renderPlayer(canSave = true) {
  ownerCount += 1

  return render(
    <OutboxOwnerProvider ownerKey={`owner-${ownerCount}`}>
      <LessonPlayer
        canSave={canSave}
        exitHref="/grammar"
        mode="lesson"
        plays={plays}
        targetId="u01-l01"
        title="am, is, are"
      />
    </OutboxOwnerProvider>
  )
}

type FetchCall = [string, RequestInit]

function sessionCalls(fetchMock: ReturnType<typeof vi.fn>) {
  return (fetchMock.mock.calls as unknown as FetchCall[]).filter(
    ([url]) => url === GRAMMAR_SESSIONS_URL
  )
}

function sentBody(call: FetchCall) {
  return JSON.parse(String(call[1].body))
}

function action(name: RegExp) {
  return screen.getByRole('button', { name })
}

function answerAndFinish() {
  fireEvent.click(action(/tiếp tục/i))
  fireEvent.click(screen.getByRole('button', { name: /am/ }))
  fireEvent.click(action(/kiểm tra/i))
  fireEvent.click(action(/tiếp tục/i))
}

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      headers: { 'content-type': 'application/json' },
      status,
    })
  )
}

/** This jsdom build ships without localStorage (see useLessonSfx.test.tsx). */
function fakeStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    clear: () => entries.clear(),
    getItem: key => entries.get(key) ?? null,
    key: index => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size
    },
    removeItem: key => {
      entries.delete(key)
    },
    setItem: (key, value) => {
      entries.set(key, value)
    },
  }
}

beforeEach(() => {
  push.mockReset()
  vi.stubGlobal('localStorage', fakeStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LessonPlayer leave guard', () => {
  it('exits straight away before anything is answered', () => {
    renderPlayer()
    fireEvent.click(action(/thoát bài/i))

    expect(push).toHaveBeenCalledWith('/grammar')
    expect(screen.queryByText('Bỏ bài?')).toBeNull()
  })

  it('asks before throwing away an answered lesson', async () => {
    renderPlayer()
    fireEvent.click(action(/tiếp tục/i))
    fireEvent.click(screen.getByRole('button', { name: /am/ }))
    fireEvent.click(action(/kiểm tra/i))
    fireEvent.click(action(/thoát bài/i))

    expect(push).not.toHaveBeenCalled()
    expect(await screen.findByText('Bỏ bài?')).toBeInTheDocument()

    fireEvent.click(action(/học tiếp/i))

    await waitFor(() => expect(screen.queryByText('Bỏ bài?')).toBeNull())
  })
})

describe('LessonPlayer saving', () => {
  it('saves the first answers once and shows the unlock from the server', async () => {
    const fetchMock = vi.fn(() => jsonResponse(200, savedResult))

    vi.stubGlobal('fetch', fetchMock)
    renderPlayer()
    answerAndFinish()

    expect(await screen.findByText(/Mở khóa: Bài hai/)).toBeInTheDocument()

    const calls = sessionCalls(fetchMock)

    expect(calls).toHaveLength(1)

    const body = sentBody(calls[0])

    expect(body).toMatchObject({
      answers: [{ answer: 0, cardId: 'u01-l01-c02' }],
      mode: 'lesson',
      targetId: 'u01-l01',
    })
    // The outbox sends the session's own key, so the route can dedupe.
    expect(
      (calls[0][1].headers as Record<string, string>)['idempotency-key']
    ).toBe(body.idempotencyKey)
  })

  it('keeps retrying a dropped connection with the same key until it lands', async () => {
    let attempts = 0
    const fetchMock = vi.fn(() => {
      attempts += 1

      return attempts <= 2
        ? Promise.reject(new TypeError('offline'))
        : jsonResponse(200, savedResult)
    })

    vi.stubGlobal('fetch', fetchMock)
    renderPlayer()
    answerAndFinish()

    expect(
      await screen.findByText(/Mở khóa: Bài hai/, undefined, { timeout: 8000 })
    ).toBeInTheDocument()

    const keys = sessionCalls(fetchMock).map(
      call => sentBody(call).idempotencyKey
    )

    expect(keys.length).toBeGreaterThanOrEqual(3)
    expect(new Set(keys).size).toBe(1)
  }, 12_000)

  it('drops a result the server rejects instead of retrying forever', async () => {
    const fetchMock = vi.fn(() =>
      jsonResponse(400, { message: 'Bài vừa được cập nhật.' })
    )

    vi.stubGlobal('fetch', fetchMock)
    renderPlayer()
    answerAndFinish()

    expect(
      await screen.findByText('Bài vừa được cập nhật.')
    ).toBeInTheDocument()
    expect(sessionCalls(fetchMock)).toHaveLength(1)
  })

  it('does not try to save without a database', async () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)
    renderPlayer(false)
    answerAndFinish()

    expect(await screen.findByText(/không được lưu/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
