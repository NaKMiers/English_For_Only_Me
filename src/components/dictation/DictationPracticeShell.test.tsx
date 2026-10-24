import { setupDom } from '@/test/setupDom'
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ensureGuestIdentity } from '@/lib/sync/clientOutbox'
import { createOutbox, type Outbox } from '@/lib/sync/outbox'
import { getDictationAnswerDraftsStorageKey } from '@/modules/dictation/preferences/dictationPreferences'
import type {
  DictationSegmentApiRecord,
  DictationSessionApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'
import {
  getDictationTranslationTrackApi,
  startOrResumeDictationSessionApi,
} from '@/requests/dictationSessionsApi'

import { DictationPracticeShell } from './DictationPracticeShell'

const playSegmentMock = vi.fn()

// next/image resolves the src against the document URL, which JSDOM leaves as
// about:blank here. The practice header renders the home logo, so stub the
// component down to the plain element the DOM assertions care about.
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => (
    <span
      role="img"
      aria-label={alt}
    />
  ),
}))

vi.mock('@/components/dictation/DictationYoutubePlayer', async () => {
  const React = await import('react')

  interface MockPlayerProps {
    onControllerChange?: (controller: {
      canReplay: boolean
      getCurrentTimeMs: () => number | null
      message: string
      pause: () => void
      playFromMs: (startMs: number) => void
      playSegment: (startMs: number, endMs: number) => void
      replay: () => void
      seekToMs: (startMs: number, options: { play: boolean }) => void
      status: 'ready'
    }) => void
  }

  return {
    DictationYoutubePlayer: ({ onControllerChange }: MockPlayerProps) => {
      React.useEffect(() => {
        onControllerChange?.({
          canReplay: true,
          getCurrentTimeMs: () => null,
          message: 'Mock player is ready.',
          pause: vi.fn(),
          playFromMs: vi.fn(),
          playSegment: playSegmentMock,
          replay: vi.fn(),
          seekToMs: vi.fn(),
          status: 'ready',
        })
      }, [onControllerChange])

      return <div>Mock player</div>
    },
  }
})

const routerPushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
    refresh: vi.fn(),
  }),
}))

vi.mock('@/requests/dictationSessionsApi', async importOriginal => ({
  ...(await importOriginal<typeof import('@/requests/dictationSessionsApi')>()),
  getDictationTranslationTrackApi: vi.fn(
    async ({ language }: { language: string }) => ({
      cues: [{ endMs: 2000, startMs: 1000, text: `caption in ${language}` }],
      language,
      overrides: {},
    })
  ),
  startOrResumeDictationSessionApi: vi.fn(async () => ({ session })),
}))

// The real header plus plain buttons for picking a translation language: the
// header's Select popup is not what these tests are about.
vi.mock(
  '@/components/dictation/DictationPracticeHeader',
  async importOriginal => {
    const actual =
      await importOriginal<
        typeof import('@/components/dictation/DictationPracticeHeader')
      >()

    return {
      DictationPracticeHeader: (
        props: Parameters<typeof actual.DictationPracticeHeader>[0]
      ) => (
        <>
          <actual.DictationPracticeHeader {...props} />
          {[...props.translationLanguages, ''].map(language => (
            <button
              key={language || 'none'}
              type="button"
              onClick={() => props.onTranslationLanguageChange(language)}
            >
              {`pick ${language || 'none'}`}
            </button>
          ))}
        </>
      ),
    }
  }
)

vi.mock('@/lib/sync/clientOutbox', () => ({
  ensureGuestIdentity: vi.fn(async () => undefined),
}))

// The shell talks to the tab-wide outbox through this hook. Tests hand it a
// real outbox wired to a fake server, so ordering, merging and retries are the
// production code paths.
let testOutbox: Outbox
let testOwnerKey: string | null = 'user-one'

vi.mock('@/components/common/OutboxOwnerProvider', () => ({
  useClientOutbox: () => testOutbox,
  useOutboxOwnerKey: () => testOwnerKey,
}))

const startOrResumeDictationSessionMock =
  startOrResumeDictationSessionApi as ReturnType<typeof vi.fn>
const ensureGuestIdentityMock = ensureGuestIdentity as ReturnType<typeof vi.fn>
const getTranslationTrackMock = getDictationTranslationTrackApi as ReturnType<
  typeof vi.fn
>

interface ServerRequest {
  body: Record<string, unknown>
  idempotencyKey: string | null
  method: string
  url: string
}

type Reply = { body: unknown; status: number }

/**
 * A fake API server. `auto` answers every request at once with a success;
 * `manual` holds each request until the test releases it, so a slow network
 * can be simulated. `replies` queues one-off answers (a 503, a 409, ...).
 */
function createFakeServer(mode: 'auto' | 'manual' = 'auto') {
  const requests: ServerRequest[] = []
  const held: Array<() => void> = []
  const replies: Reply[] = []

  function successFor(request: ServerRequest): Reply {
    if (request.url.endsWith('/attempts'))
      return {
        status: 201,
        body: {
          attempt: {
            action: request.body.action,
            id: `server-${String(request.body.idempotencyKey)}`,
            idempotencyKey: request.body.idempotencyKey,
            isPassed:
              request.body.action === 'check' &&
              PASSING_ANSWERS.has(String(request.body.typedAnswer)),
            segmentId: request.body.segmentId,
          },
          mode: 'create',
          nextSegmentId: null,
          progress: {
            attemptCount: 1,
            attemptStatus: 'revealed',
            lastAttemptAt: now.toISOString(),
            segmentId: request.body.segmentId,
          },
          session,
        },
      }

    return { status: 200, body: { session } }
  }

  const fetchImpl = vi.fn(async (input: unknown, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>
    const request: ServerRequest = {
      body: init?.body ? JSON.parse(String(init.body)) : {},
      idempotencyKey: headers['idempotency-key'] ?? null,
      method: init?.method ?? 'GET',
      url: String(input),
    }

    requests.push(request)

    const reply = replies.shift() ?? successFor(request)

    if (mode === 'manual')
      await new Promise<void>(resolve => {
        held.push(resolve)
      })

    return new Response(JSON.stringify(reply.body), {
      headers: { 'content-type': 'application/json' },
      status: reply.status,
    })
  })

  return {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    /** Release the oldest held request. */
    releaseNext: () => held.shift()?.(),
    heldCount: () => held.length,
    replies,
    requests,
  }
}

// The fake server grades like the real one for the fixtures used here.
const PASSING_ANSWERS = new Set([
  'At harvest, the Mengs.',
  'Second sentence.',
  'Third sentence.',
])

let server = createFakeServer()

function useServer(mode: 'auto' | 'manual' = 'auto') {
  testOutbox.dispose()
  server = createFakeServer(mode)
  testOutbox = createOutbox({
    fetchImpl: server.fetchImpl,
    maxRetryDelayMs: 20,
    owner: 'user-one',
    retryBaseDelayMs: 5,
  })

  return server
}

function attemptRequests() {
  return server.requests.filter(request => request.url.endsWith('/attempts'))
}

function patchRequests() {
  return server.requests.filter(request => request.method === 'PATCH')
}

setupDom()
beforeEach(() => {
  testOwnerKey = 'user-one'
  server = createFakeServer()
  testOutbox = createOutbox({
    fetchImpl: server.fetchImpl,
    maxRetryDelayMs: 20,
    owner: 'user-one',
    retryBaseDelayMs: 5,
  })
})
afterEach(() => {
  cleanup()
  testOutbox.dispose()
  document.body.innerHTML = ''
  storage.clear()
  vi.clearAllMocks()
})

const storage = (() => {
  const data = new Map<string, string>()

  return {
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    removeItem: (key: string) => data.delete(key),
    setItem: (key: string, value: string) => data.set(key, value),
  }
})()

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: storage,
})
Object.defineProperty(window, 'sessionStorage', {
  configurable: true,
  value: storage,
})
Object.defineProperty(globalThis, 'Element', {
  configurable: true,
  value: window.Element,
})
Object.defineProperty(globalThis, 'Node', {
  configurable: true,
  value: window.Node,
})
Object.defineProperty(globalThis, 'requestAnimationFrame', {
  configurable: true,
  value: (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(Date.now()), 16),
})
Object.defineProperty(globalThis, 'cancelAnimationFrame', {
  configurable: true,
  value: (id: number) => window.clearTimeout(id),
})

const now = new Date('2026-01-01T00:00:00.000Z')
const video: DictationVideoApiRecord = {
  activeTranscriptId: '507f1f77bcf86cd799439012',
  channelTitle: 'TED-Ed',
  collections: [],
  createdAt: now,
  defaultLanguage: 'en',
  durationSeconds: 300,
  id: '507f1f77bcf86cd799439011',
  importStatus: 'metadataReady',
  importWarning: null,
  level: null,
  order: 0,
  purpose: 'ielts-listening',
  sectionId: null,
  sentenceCount: 1,
  sourceType: 'youtube',
  sourceUrl: 'https://www.youtube.com/watch?v=abc123abc12',
  status: 'ready',
  tags: [],
  thumbnailUrl: null,
  title: 'Practice video',
  topicId: null,
  transcriptStatus: 'manualAdded',
  updatedAt: now,
  youtubeUrl: 'https://www.youtube.com/watch?v=abc123abc12',
  youtubeVideoId: 'abc123abc12',
}
const segment: DictationSegmentApiRecord = {
  attemptCount: 0,
  attemptStatus: 'notStarted',
  createdAt: now,
  cueIndexes: [],
  hints: [],
  hintsOverridden: false,
  endMs: 2000,
  id: '507f1f77bcf86cd799439013',
  lastAttemptAt: null,
  normalizedText: 'at harvest the mengs',
  order: 0,
  qualityFlags: [],
  startMs: 1000,
  text: 'At harvest, the Mengs.',
  transcriptId: '507f1f77bcf86cd799439012',
  transcriptSourceHash: 'hash',
  updatedAt: now,
  videoId: video.id,
  warningAccepted: false,
}
const secondSegment: DictationSegmentApiRecord = {
  ...segment,
  endMs: 5000,
  id: '507f1f77bcf86cd799439015',
  normalizedText: 'second sentence',
  order: 1,
  startMs: 3000,
  text: 'Second sentence.',
}
const session: DictationSessionApiRecord = {
  completedAt: null,
  createdAt: now,
  currentSegmentId: segment.id,
  currentSegmentOrder: 0,
  id: '507f1f77bcf86cd799439014',
  isVideoHidden: false,
  lastActiveAt: now,
  playbackSpeed: 1,
  showShortcuts: true,
  startedAt: now,
  status: 'active',
  transcriptId: segment.transcriptId,
  updatedAt: now,
  userId: 'user-one',
  videoId: video.id,
}

function renderPracticeShell(
  initialSession: DictationSessionApiRecord | null = session,
  segmentOverride: DictationSegmentApiRecord = segment,
  completions = 0,
  segmentList: DictationSegmentApiRecord[] = [segmentOverride]
) {
  return render(
    <DictationPracticeShell
      completions={completions}
      initialSession={initialSession}
      initialTranslationTrack={null}
      segments={segmentList}
      translationLanguages={[]}
      video={video}
    />
  )
}

function typeAnswer(textarea: HTMLElement, value: string) {
  fireEvent.input(textarea, {
    target: { value },
  })
  fireEvent.change(textarea, {
    target: { value },
  })
}

describe('DictationPracticeShell attempts', () => {
  test('Check verdict appears before the session POST resolves, then the attempt lands', async () => {
    let resolveSession: (value: { session: DictationSessionApiRecord }) => void
    const sessionStart = new Promise<{ session: DictationSessionApiRecord }>(
      resolve => {
        resolveSession = resolve
      }
    )

    startOrResumeDictationSessionMock.mockReturnValueOnce(sessionStart)

    const view = renderPracticeShell(null)

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    typeAnswer(view.getByLabelText('Type what you hear'), 'kjhk')
    fireEvent.click(view.getByRole('button', { name: 'Check' }))

    // Graded locally and shown at once, while the session start still hangs.
    expect(view.getByRole('status').textContent).toContain('Incorrect')
    expect(attemptRequests()).toHaveLength(0)

    await act(async () => {
      resolveSession!({ session })
    })

    await waitFor(() => {
      expect(attemptRequests()).toHaveLength(1)
    })
    expect(attemptRequests()[0]).toMatchObject({
      body: expect.objectContaining({
        action: 'check',
        segmentId: segment.id,
        typedAnswer: 'kjhk',
      }),
      url: `/api/dictation/sessions/${session.id}/attempts`,
    })
    expect(attemptRequests()[0].idempotencyKey).toBe(
      attemptRequests()[0].body.idempotencyKey
    )
    expect(view.getByRole('status').textContent).toContain('Incorrect')
  })

  test('a first-time visitor mints the guest identity before the session starts', async () => {
    testOwnerKey = null

    const order: string[] = []

    ensureGuestIdentityMock.mockImplementationOnce(async () => {
      order.push('guest')
    })
    startOrResumeDictationSessionMock.mockImplementationOnce(async () => {
      order.push('session')

      return { session }
    })

    renderPracticeShell(null)

    await waitFor(() => {
      expect(order).toEqual(['guest', 'session'])
    })
  })

  test('Check gives immediate incorrect feedback for a wrong answer', async () => {
    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    typeAnswer(view.getByLabelText('Type what you hear'), 'kjhk')
    fireEvent.click(view.getByRole('button', { name: 'Check' }))

    await waitFor(() => {
      expect(view.getByRole('status').textContent).toContain('Incorrect')
    })
  })

  test.each([
    ['five kg', '5kg'],
    ['21st', 'twenty first'],
    ['$5', 'five dollars'],
  ])(
    'Check rewrites accepted variant "%s" back to the exact answer',
    async (expectedText, typedAnswer) => {
      const variantSegment = {
        ...segment,
        normalizedText: '',
        text: expectedText,
      }
      const view = renderPracticeShell(session, variantSegment)

      fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
      const textarea = view.getByLabelText(
        'Type what you hear'
      ) as HTMLTextAreaElement

      typeAnswer(textarea, typedAnswer)

      await act(async () => {
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(textarea.value).toBe(typedAnswer)
      })

      fireEvent.click(view.getByRole('button', { name: 'Check' }))

      await waitFor(() => {
        expect(textarea.value).toBe(expectedText)
      })
      expect(view.getByRole('status').textContent).toContain('You are correct!')
    }
  )

  test('Escape skips first, then retries when Retry is available', async () => {
    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    const textarea = view.getByLabelText('Type what you hear')

    fireEvent.keyDown(textarea, { key: 'Escape' })

    await waitFor(() => {
      expect(view.getByRole('status').textContent).toContain('Answer revealed')
      expect(view.getByRole('button', { name: 'Retry' })).not.toBeNull()
    })

    fireEvent.keyDown(textarea, { key: 'Escape' })

    await waitFor(() => {
      expect((textarea as HTMLTextAreaElement).value).toBe('')
    })
  })

  test('Escape reveals (does not clear) on a resumed segment attempted in an earlier visit', async () => {
    // Persisted attemptCount from before, but no live attempt this session.
    const attempted: DictationSegmentApiRecord = {
      ...segment,
      attemptCount: 1,
      attemptStatus: 'correct',
    }
    const view = renderPracticeShell(session, attempted, 0, [attempted])

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    const textarea = view.getByLabelText('Type what you hear')
    typeAnswer(textarea, 'my fresh attempt')

    fireEvent.keyDown(textarea, { key: 'Escape' })

    await waitFor(() => {
      expect(view.getByRole('status').textContent).toContain('Answer revealed')
    })
    // The old bug cleared the draft to '' (retry); it must not anymore.
    expect((textarea as HTMLTextAreaElement).value).not.toBe('')
  })

  test('Skip reveals the answer and switches to Finish', async () => {
    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))

    await waitFor(() => {
      expect(view.getByRole('status').textContent).toContain('Answer revealed')
    })
    expect(view.getByRole('button', { name: 'Finish' })).not.toBeNull()
  })

  test('finishing the last segment marks the session completed', async () => {
    // Single segment => it is the last segment.
    const view = renderPracticeShell(null)

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))

    const finish = await view.findByRole('button', { name: 'Finish' })
    fireEvent.click(finish)

    await waitFor(() => {
      expect(patchRequests()).toContainEqual(
        expect.objectContaining({
          body: { status: 'completed' },
          url: `/api/dictation/sessions/${session.id}`,
        })
      )
    })
    // The completion is queued behind the skip, in the same lane.
    const completionIndex = server.requests.findIndex(
      request => request.body.status === 'completed'
    )
    const skipIndex = server.requests.findIndex(
      request => request.body.action === 'skip'
    )

    expect(skipIndex).toBeGreaterThanOrEqual(0)
    expect(skipIndex).toBeLessThan(completionIndex)
  })

  test('Restart keeps the completion badge but clears old answers client-side', async () => {
    const completedSegment: DictationSegmentApiRecord = {
      ...segment,
      attemptCount: 1,
      attemptStatus: 'correct',
    }
    const resumedSession: DictationSessionApiRecord = {
      ...session,
      currentSegmentId: secondSegment.id,
      currentSegmentOrder: 1,
    }
    const view = renderPracticeShell(resumedSession, completedSegment, 1, [
      completedSegment,
      secondSegment,
    ])

    expect(view.getByText('Copper')).not.toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Restart progress' }))
    fireEvent.click(view.getByRole('button', { name: 'Restart' }))

    const textarea = await view.findByLabelText('Type what you hear')

    expect((textarea as HTMLTextAreaElement).value).toBe('')
    expect(view.getByLabelText('Current segment').textContent).toContain(
      '1 / 2'
    )
    expect(view.getByText('Copper')).not.toBeNull()
    expect(playSegmentMock).toHaveBeenCalledWith(
      completedSegment.startMs,
      completedSegment.endMs
    )
    await act(async () => {
      await Promise.resolve()
    })
    expect(patchRequests()).toHaveLength(0)
  })
})

describe('DictationPracticeShell entry screen', () => {
  const twoSegments = [segment, secondSegment]
  const resumableSession: DictationSessionApiRecord = {
    ...session,
    currentSegmentId: secondSegment.id,
    currentSegmentOrder: 1,
  }
  const zeroProgressSession: DictationSessionApiRecord = {
    ...session,
    currentSegmentOrder: 0,
  }

  function expectStartScreen(view: ReturnType<typeof renderPracticeShell>) {
    expect(view.getByRole('button', { name: 'Start Dictation' })).not.toBeNull()
    expect(
      view.queryByRole('button', { name: 'Continue Dictation' })
    ).toBeNull()
    expect(
      view.queryByRole('button', { name: 'Repeat this exercise' })
    ).toBeNull()
  }

  function expectContinueScreen(view: ReturnType<typeof renderPracticeShell>) {
    expect(
      view.getByRole('button', { name: 'Continue Dictation' })
    ).not.toBeNull()
    expect(
      view.getByRole('button', { name: 'Restart from the beginning' })
    ).not.toBeNull()
    expect(
      view.queryByRole('button', { name: 'Repeat this exercise' })
    ).toBeNull()
  }

  function expectFinishScreen(view: ReturnType<typeof renderPracticeShell>) {
    // Unique markers of the Done panel.
    expect(
      view.getByRole('button', { name: 'Repeat this exercise' })
    ).not.toBeNull()
    expect(
      view.getByText('You have completed this exercise, good job!')
    ).not.toBeNull()
    // Not the ready panel.
    expect(view.queryByRole('button', { name: 'Start Dictation' })).toBeNull()
    expect(
      view.queryByRole('button', { name: 'Continue Dictation' })
    ).toBeNull()
  }

  // Case 1: first practice, no segment completed, reload -> Start.
  test('case 1: never completed + no progress -> Start', () => {
    expectStartScreen(
      renderPracticeShell(zeroProgressSession, segment, 0, twoSegments)
    )
  })

  // Case 2: first practice, >=1 segment completed, reload -> Continue/Restart.
  test('case 2: never completed + in-progress -> Continue', () => {
    expectContinueScreen(
      renderPracticeShell(resumableSession, segment, 0, twoSegments)
    )
  })

  // Cases 4/7/8: completed all, no active session -> Finish.
  test('case 4: completed before + no active session -> Finish', () => {
    expectFinishScreen(renderPracticeShell(null, segment, 1, twoSegments))
  })

  // Case 5: completed before, new attempt with no segment done -> Finish.
  test('case 5: completed before + active session with no progress -> Finish', () => {
    expectFinishScreen(
      renderPracticeShell(zeroProgressSession, segment, 1, twoSegments)
    )
  })

  // Case 6: completed before, >=1 segment this attempt -> Continue/Restart.
  test('case 6: completed before + in-progress -> Continue', () => {
    expectContinueScreen(
      renderPracticeShell(resumableSession, segment, 1, twoSegments)
    )
  })
})

describe('DictationPracticeShell leave guard', () => {
  test('an in-app link click mid-practice opens the styled modal instead of navigating', async () => {
    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))

    const link = document.createElement('a')
    link.setAttribute('href', '/dictation')
    link.textContent = 'Go to lab'
    document.body.appendChild(link)

    fireEvent.click(link)

    await waitFor(() => {
      expect(view.getByText('Leave this practice?')).not.toBeNull()
    })
    // Navigation is held until the learner confirms.
    expect(routerPushMock).not.toHaveBeenCalled()

    fireEvent.click(view.getByRole('button', { name: 'Leave' }))

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith('/dictation')
    })
  })

  test('Keep practicing dismisses the modal without navigating', async () => {
    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))

    const link = document.createElement('a')
    link.setAttribute('href', '/dictation')
    document.body.appendChild(link)

    fireEvent.click(link)

    await waitFor(() => {
      expect(view.getByText('Leave this practice?')).not.toBeNull()
    })

    fireEvent.click(view.getByRole('button', { name: 'Keep practicing' }))

    await waitFor(() => {
      expect(view.queryByText('Leave this practice?')).toBeNull()
    })
    expect(routerPushMock).not.toHaveBeenCalled()
  })
})

describe('DictationPracticeShell outbox integration', () => {
  const thirdSegment: DictationSegmentApiRecord = {
    ...segment,
    endMs: 8000,
    id: '507f1f77bcf86cd799439016',
    normalizedText: 'third sentence',
    order: 2,
    startMs: 6000,
    text: 'Third sentence.',
  }
  const threeSegments = [segment, secondSegment, thirdSegment]

  function pressKey(target: HTMLElement, key: string, ctrlKey = false) {
    fireEvent.keyDown(target, { ctrlKey, key })
  }

  async function drainHeldRequests(expectedTotal: number) {
    for (let index = 0; index < expectedTotal; index += 1) {
      await waitFor(() => {
        expect(server.heldCount()).toBe(1)
      })
      await act(async () => {
        server.releaseNext()
      })
    }
  }

  test('a fast Check/Enter run while moving the cursor lands every write, in order', async () => {
    useServer('manual')

    const view = renderPracticeShell(session, segment, 0, threeSegments)

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))

    const textarea = view.getByLabelText('Type what you hear')

    // Sentence 1: pass, then Enter again to advance.
    typeAnswer(textarea, 'At harvest, the Mengs.')
    pressKey(textarea, 'Enter')
    pressKey(textarea, 'Enter')
    // Sentence 2: a wrong check, then hop forward, back and forward again.
    typeAnswer(view.getByLabelText('Type what you hear'), 'wrong words')
    pressKey(view.getByLabelText('Type what you hear'), 'Enter')
    pressKey(view.getByLabelText('Type what you hear'), ']', true)
    pressKey(view.getByLabelText('Type what you hear'), '[', true)
    pressKey(view.getByLabelText('Type what you hear'), ']', true)
    // Sentence 3: skip.
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))

    // Verdicts are on screen before a single request was answered.
    expect(view.getByRole('status').textContent).toContain('Answer revealed')
    expect(view.getByLabelText('Current segment').textContent).toContain(
      '3 / 3'
    )

    // attempt 1, cursor -> 2, attempt 2, cursor -> 3 (three moves merged),
    // attempt 3. One in flight at a time, in the order they were made.
    await drainHeldRequests(5)

    await waitFor(() => {
      expect(server.requests).toHaveLength(5)
    })
    expect(
      server.requests.map(request =>
        request.url.endsWith('/attempts')
          ? `attempt:${String(request.body.segmentId)}:${String(request.body.action)}`
          : `cursor:${String(request.body.currentSegmentId)}`
      )
    ).toEqual([
      `attempt:${segment.id}:check`,
      `cursor:${secondSegment.id}`,
      `attempt:${secondSegment.id}:check`,
      `cursor:${thirdSegment.id}`,
      `attempt:${thirdSegment.id}:skip`,
    ])
    expect(view.queryByRole('alert')).toBeNull()
  })

  test('a 5xx is retried until the attempt lands, with the same idempotency key', async () => {
    server.replies.push({
      body: { message: 'Temporary failure.' },
      status: 503,
    })

    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))

    await waitFor(() => {
      expect(attemptRequests()).toHaveLength(2)
    })

    const [failed, landed] = attemptRequests()

    expect(failed.idempotencyKey).toBe(landed.idempotencyKey)
    expect(failed.body).toEqual(landed.body)
    await act(async () => {
      await testOutbox.whenIdle()
    })
    expect(testOutbox.pendingCount()).toBe(0)
    expect(view.queryByRole('alert')).toBeNull()
  })

  test('View Results waits for queued writes before navigating', async () => {
    useServer('manual')

    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    fireEvent.click(await view.findByRole('button', { name: 'Finish' }))

    const results = await view.findByRole('link', { name: 'View Results' })

    fireEvent.click(results)

    expect(view.getByRole('link', { name: 'Saving...' })).not.toBeNull()
    await waitFor(() => {
      expect(server.heldCount()).toBe(1)
    })
    expect(routerPushMock).not.toHaveBeenCalled()

    // The skip, then the completion, then Results.
    await drainHeldRequests(2)

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith(
        `/dictation/videos/${video.id}/results`
      )
    })
    expect(server.requests.map(request => request.method)).toEqual([
      'POST',
      'PATCH',
    ])
  })

  test('View Results navigates anyway once the bounded save wait gives up', async () => {
    useServer('manual')

    // The outbox reports it could not drain in time; the held skip stays
    // queued and keeps delivering in the background.
    const whenIdle = vi.spyOn(testOutbox, 'whenIdle').mockResolvedValue(false)
    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    fireEvent.click(await view.findByRole('button', { name: 'Finish' }))
    fireEvent.click(await view.findByRole('link', { name: 'View Results' }))

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith(
        `/dictation/videos/${video.id}/results`
      )
    })
    expect(server.heldCount()).toBe(1)

    const [options] = whenIdle.mock.calls[0]

    expect(options?.timeoutMs).toBeGreaterThan(0)
    expect(options?.timeoutMs).toBeLessThanOrEqual(8_000)
  })

  test('Repeat while the completion is still queued starts a fresh session', async () => {
    useServer('manual')

    const freshSession: DictationSessionApiRecord = {
      ...session,
      id: '507f1f77bcf86cd799439099',
    }

    startOrResumeDictationSessionMock.mockResolvedValueOnce({
      mode: 'start',
      session: freshSession,
    })

    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    fireEvent.click(await view.findByRole('button', { name: 'Finish' }))
    await waitFor(() => {
      expect(server.heldCount()).toBe(1)
    })
    // The completion PATCH answers with the closed session once released.
    server.replies.push({
      body: { session: { ...session, status: 'completed' } },
      status: 200,
    })

    fireEvent.click(view.getByRole('button', { name: 'Repeat this exercise' }))
    fireEvent.click(await view.findByRole('button', { name: 'Skip' }))

    // The fresh start waits for the completion, or the server would resume
    // the session that completion is about to close.
    expect(startOrResumeDictationSessionMock).not.toHaveBeenCalled()

    await drainHeldRequests(3)

    await waitFor(() => {
      expect(attemptRequests()).toHaveLength(2)
    })
    expect(startOrResumeDictationSessionMock).toHaveBeenCalledTimes(1)
    expect(attemptRequests().map(request => request.url)).toEqual([
      `/api/dictation/sessions/${session.id}/attempts`,
      `/api/dictation/sessions/${freshSession.id}/attempts`,
    ])
    expect(patchRequests()[0]).toMatchObject({
      body: { status: 'completed' },
      url: `/api/dictation/sessions/${session.id}`,
    })
    expect(view.queryByRole('alert')).toBeNull()
  })

  test('a 404 on a write makes Retry saving start a fresh session', async () => {
    const freshSession: DictationSessionApiRecord = {
      ...session,
      id: '507f1f77bcf86cd799439098',
    }

    server.replies.push({
      body: { message: 'This dictation session was not found.' },
      status: 404,
    })
    startOrResumeDictationSessionMock.mockResolvedValueOnce({
      mode: 'start',
      session: freshSession,
    })

    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))

    const alert = await view.findByRole('alert')

    expect(alert.textContent).toContain('This dictation session was not found.')

    fireEvent.click(view.getByRole('button', { name: 'Retry saving' }))

    await waitFor(() => {
      expect(attemptRequests()).toHaveLength(2)
    })
    expect(startOrResumeDictationSessionMock).toHaveBeenCalledTimes(1)
    expect(attemptRequests()[1].url).toBe(
      `/api/dictation/sessions/${freshSession.id}/attempts`
    )
    expect(attemptRequests()[1].body.idempotencyKey).toBe(
      attemptRequests()[0].body.idempotencyKey
    )
    await waitFor(() => {
      expect(view.queryByRole('alert')).toBeNull()
    })
  })

  test('a refused attempt shows the session error with a retry that re-sends it', async () => {
    server.replies.push({
      body: { message: 'This dictation session is not active.' },
      status: 409,
    })

    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))

    // The verdict stays; the save failure is visible, not dropped.
    expect(view.getByRole('status').textContent).toContain('Answer revealed')

    const alert = await view.findByRole('alert')

    expect(alert.textContent).toContain('This dictation session is not active.')

    fireEvent.click(view.getByRole('button', { name: 'Retry saving' }))

    await waitFor(() => {
      expect(attemptRequests()).toHaveLength(2)
    })
    // A session-level refusal re-resolves the session before re-sending.
    expect(startOrResumeDictationSessionMock).toHaveBeenCalled()
    expect(attemptRequests()[1].body.idempotencyKey).toBe(
      attemptRequests()[0].body.idempotencyKey
    )
    await waitFor(() => {
      expect(view.queryByRole('alert')).toBeNull()
    })
  })

  test('Repeat while the first session start is in flight still lands the completion', async () => {
    let resolveSession: (value: { session: DictationSessionApiRecord }) => void
    const sessionStart = new Promise<{ session: DictationSessionApiRecord }>(
      resolve => {
        resolveSession = resolve
      }
    )
    const freshSession: DictationSessionApiRecord = {
      ...session,
      id: '507f1f77bcf86cd799439099',
    }

    startOrResumeDictationSessionMock.mockReturnValueOnce(sessionStart)
    startOrResumeDictationSessionMock.mockResolvedValueOnce({
      mode: 'start',
      session: freshSession,
    })

    const view = renderPracticeShell(null)

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    fireEvent.click(await view.findByRole('button', { name: 'Finish' }))
    fireEvent.click(view.getByRole('button', { name: 'Repeat this exercise' }))
    fireEvent.click(await view.findByRole('button', { name: 'Skip' }))

    await act(async () => {
      resolveSession({ session })
    })

    // The old run's writes go to the old session, the repeat run's skip to a
    // fresh one started only after that completion landed.
    await waitFor(() => {
      expect(attemptRequests()).toHaveLength(2)
    })
    expect(attemptRequests().map(request => request.url)).toEqual([
      `/api/dictation/sessions/${session.id}/attempts`,
      `/api/dictation/sessions/${freshSession.id}/attempts`,
    ])
    expect(patchRequests()).toHaveLength(1)
    expect(patchRequests()[0]).toMatchObject({
      body: { status: 'completed' },
      url: `/api/dictation/sessions/${session.id}`,
    })
    expect(server.requests.indexOf(patchRequests()[0])).toBeLessThan(
      server.requests.indexOf(attemptRequests()[1])
    )
    expect(startOrResumeDictationSessionMock).toHaveBeenCalledTimes(2)
    expect(view.queryByRole('alert')).toBeNull()
  })

  test('Rewind after Finish moves on to a fresh session', async () => {
    const freshSession: DictationSessionApiRecord = {
      ...session,
      id: '507f1f77bcf86cd799439097',
    }
    const view = renderPracticeShell(session, segment, 0, [
      segment,
      secondSegment,
    ])

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    fireEvent.click(await view.findByRole('button', { name: 'Next' }))
    fireEvent.click(await view.findByRole('button', { name: 'Skip' }))
    fireEvent.click(await view.findByRole('button', { name: 'Finish' }))
    await waitFor(() => {
      expect(patchRequests().map(request => request.body.status)).toContain(
        'completed'
      )
    })
    await act(async () => {
      await testOutbox.whenIdle()
    })

    startOrResumeDictationSessionMock.mockResolvedValueOnce({
      mode: 'start',
      session: freshSession,
    })

    fireEvent.click(
      view.getByRole('button', { name: 'Rewind to first segment' })
    )
    fireEvent.click(await view.findByRole('button', { name: 'Skip' }))

    await waitFor(() => {
      expect(attemptRequests()).toHaveLength(3)
    })
    expect(attemptRequests()[2].url).toBe(
      `/api/dictation/sessions/${freshSession.id}/attempts`
    )
    expect(patchRequests().at(-1)).toMatchObject({
      body: { currentSegmentId: segment.id },
      url: `/api/dictation/sessions/${freshSession.id}`,
    })
    expect(view.queryByRole('alert')).toBeNull()
  })

  test('Repeat during the Results save wait keeps the learner on the new run', async () => {
    useServer('manual')

    const view = renderPracticeShell()

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    fireEvent.click(await view.findByRole('button', { name: 'Finish' }))
    fireEvent.click(await view.findByRole('link', { name: 'View Results' }))
    expect(view.getByRole('link', { name: 'Saving...' })).not.toBeNull()

    fireEvent.click(view.getByRole('button', { name: 'Repeat this exercise' }))

    // The skip, then the completion; the save wait then settles.
    await drainHeldRequests(2)
    await act(async () => {
      await testOutbox.whenIdle()
      await new Promise(resolve => setTimeout(resolve, 20))
    })

    expect(routerPushMock).not.toHaveBeenCalled()
    expect(view.getByLabelText('Type what you hear')).not.toBeNull()
  })

  test('a refused cursor move is dropped, not left waiting for Retry saving', async () => {
    const view = renderPracticeShell(session, segment, 0, [
      segment,
      secondSegment,
    ])

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    await waitFor(() => {
      expect(attemptRequests()).toHaveLength(1)
    })
    await act(async () => {
      await testOutbox.whenIdle()
    })

    server.replies.push({
      body: { message: 'This segment does not belong to the active session.' },
      status: 409,
    })
    fireEvent.click(view.getByRole('button', { name: 'Next' }))

    await waitFor(() => {
      expect(patchRequests()).toHaveLength(1)
    })
    await act(async () => {
      await testOutbox.whenIdle()
    })

    expect(view.queryByRole('alert')).toBeNull()
    expect(view.queryByRole('button', { name: 'Retry saving' })).toBeNull()
    expect(patchRequests()).toHaveLength(1)
  })

  test('an offline session start retries, and queued writes land once it connects', async () => {
    startOrResumeDictationSessionMock.mockRejectedValueOnce(
      new TypeError('Failed to fetch')
    )

    const view = renderPracticeShell(null)

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))

    // Pending, not failed: no alert and no Retry saving while it retries.
    await waitFor(() => {
      expect(view.getByText(/Could not reach the server/)).not.toBeNull()
    })
    expect(view.queryByRole('alert')).toBeNull()

    await waitFor(
      () => {
        expect(attemptRequests()).toHaveLength(1)
      },
      { timeout: 3_000 }
    )
    expect(startOrResumeDictationSessionMock).toHaveBeenCalledTimes(2)
    expect(view.queryByText(/Could not reach the server/)).toBeNull()
    expect(view.queryByRole('alert')).toBeNull()
  })

  test('a refused session start is a visible failure, not retried', async () => {
    startOrResumeDictationSessionMock.mockRejectedValueOnce(
      new Error('Build sentence segments before starting practice.')
    )

    const view = renderPracticeShell(null)

    const alert = await view.findByRole('alert')

    expect(alert.textContent).toContain(
      'Build sentence segments before starting practice.'
    )

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 700))
    })
    expect(startOrResumeDictationSessionMock).toHaveBeenCalledTimes(1)
  })

  test('preference changes merge into one PATCH that carries the whole desired state', async () => {
    useServer('manual')

    const view = renderPracticeShell(session, segment, 0, threeSegments)

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    // An attempt holds the lane so the next writes queue up behind it.
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    fireEvent.click(view.getByRole('switch', { name: 'Shortcut hints' }))
    fireEvent.click(view.getByRole('switch', { name: 'Shortcut hints' }))
    fireEvent.click(view.getByRole('switch', { name: 'Shortcut hints' }))

    await drainHeldRequests(2)

    await waitFor(() => {
      expect(patchRequests()).toHaveLength(1)
    })
    expect(patchRequests()[0].body).toEqual({
      isVideoHidden: false,
      playbackSpeed: 1,
      showShortcuts: false,
    })
  })
})

describe('DictationPracticeShell translations', () => {
  test('ships one language and fetches another only when it is picked', async () => {
    const view = render(
      <DictationPracticeShell
        completions={0}
        initialSession={session}
        initialTranslationTrack={{
          cues: [{ endMs: 2000, startMs: 1000, text: 'caption in fr' }],
          language: 'fr',
          overrides: { [segment.id]: 'Override francais' },
        }}
        segments={[segment]}
        translationLanguages={['fr', 'vi']}
        video={video}
      />
    )

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))

    // The opening language uses its override, with no extra request.
    await waitFor(() => {
      expect(view.getByText('Override francais')).not.toBeNull()
    })
    expect(getTranslationTrackMock).not.toHaveBeenCalled()

    fireEvent.click(view.getByRole('button', { name: 'pick vi' }))

    await waitFor(() => {
      expect(view.getByText('caption in vi')).not.toBeNull()
    })
    expect(getTranslationTrackMock).toHaveBeenCalledTimes(1)
    expect(getTranslationTrackMock).toHaveBeenCalledWith({
      language: 'vi',
      videoId: video.id,
    })

    // Switching back, or to None, needs no request.
    fireEvent.click(view.getByRole('button', { name: 'pick fr' }))
    fireEvent.click(view.getByRole('button', { name: 'pick none' }))
    fireEvent.click(view.getByRole('button', { name: 'pick vi' }))
    expect(getTranslationTrackMock).toHaveBeenCalledTimes(1)
  })
  test('a failed translation fetch shows the error, then refetches when picked again', async () => {
    getTranslationTrackMock.mockRejectedValueOnce(
      new Error('Could not load this translation.')
    )

    const view = render(
      <DictationPracticeShell
        completions={0}
        initialSession={session}
        initialTranslationTrack={{
          cues: [{ endMs: 2000, startMs: 1000, text: 'caption in fr' }],
          language: 'fr',
          overrides: {},
        }}
        segments={[segment]}
        translationLanguages={['fr', 'vi']}
        video={video}
      />
    )

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    fireEvent.click(view.getByRole('button', { name: 'pick vi' }))

    await waitFor(() => {
      expect(view.getByText('Could not load this translation.')).not.toBeNull()
    })

    fireEvent.click(view.getByRole('button', { name: 'pick vi' }))

    await waitFor(() => {
      expect(view.getByText('caption in vi')).not.toBeNull()
    })
    expect(view.queryByText('Could not load this translation.')).toBeNull()
    expect(getTranslationTrackMock).toHaveBeenCalledTimes(2)
  })

  test('a failed fetch for a language the learner left does not show its error', async () => {
    let rejectTrack: (error: Error) => void = () => undefined

    getTranslationTrackMock.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectTrack = reject
        })
    )

    const view = render(
      <DictationPracticeShell
        completions={0}
        initialSession={session}
        initialTranslationTrack={{
          cues: [{ endMs: 2000, startMs: 1000, text: 'caption in fr' }],
          language: 'fr',
          overrides: {},
        }}
        segments={[segment]}
        translationLanguages={['fr', 'vi']}
        video={video}
      />
    )

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    fireEvent.click(view.getByRole('button', { name: 'Skip' }))
    fireEvent.click(view.getByRole('button', { name: 'pick vi' }))
    fireEvent.click(view.getByRole('button', { name: 'pick fr' }))

    await act(async () => {
      rejectTrack(new Error('Could not load this translation.'))
    })

    expect(view.queryByText('Could not load this translation.')).toBeNull()
    expect(view.getByText('caption in fr')).not.toBeNull()
  })
})

describe('DictationPracticeShell drafts', () => {
  test('saves drafts on a debounce, under the learner own key', async () => {
    const view = renderPracticeShell()
    const key = getDictationAnswerDraftsStorageKey(video.id, 'user-one')

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    typeAnswer(view.getByLabelText('Type what you hear'), 'a')
    typeAnswer(view.getByLabelText('Type what you hear'), 'ab')
    typeAnswer(view.getByLabelText('Type what you hear'), 'abc')

    // Not on every keystroke.
    expect(storage.getItem(key)).toBeNull()

    await waitFor(() => {
      expect(storage.getItem(key)).toBe(JSON.stringify({ [segment.id]: 'abc' }))
    })
  })

  test('flushes a pending draft when the tab is hidden', () => {
    const view = renderPracticeShell()
    const key = getDictationAnswerDraftsStorageKey(video.id, 'user-one')

    fireEvent.click(view.getByRole('button', { name: 'Start Dictation' }))
    typeAnswer(view.getByLabelText('Type what you hear'), 'typed then hid')

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    fireEvent(document, new window.Event('visibilitychange'))

    expect(storage.getItem(key)).toBe(
      JSON.stringify({ [segment.id]: 'typed then hid' })
    )
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    })
  })
})
