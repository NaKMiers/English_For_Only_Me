import { setupDom } from '@/test/setupDom'
import {
  act,
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type {
  DictationSegmentApiRecord,
  DictationSessionApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'
import { submitDictationAttemptApi } from '@/requests/dictationAttemptsApi'
import {
  startOrResumeDictationSessionApi,
  updateDictationSessionApi,
} from '@/requests/dictationSessionsApi'

import { DictationPracticeShell } from './DictationPracticeShell'

const playSegmentMock = vi.fn()

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

vi.mock('@/requests/dictationAttemptsApi', () => ({
  submitDictationAttemptApi: vi.fn(async (sessionId: string) => ({
    mode: 'create',
    nextSegmentId: null,
    session: {
      ...session,
      id: sessionId,
    },
  })),
}))

vi.mock('@/requests/dictationSessionsApi', () => ({
  updateDictationSessionApi: vi.fn(async () => ({ session })),
  startOrResumeDictationSessionApi: vi.fn(async () => ({ session })),
}))

const submitDictationAttemptMock = submitDictationAttemptApi as ReturnType<
  typeof vi.fn
>
const startOrResumeDictationSessionMock =
  startOrResumeDictationSessionApi as ReturnType<typeof vi.fn>
const updateDictationSessionMock = updateDictationSessionApi as ReturnType<
  typeof vi.fn
>

setupDom()
afterEach(() => {
  cleanup()
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
      segments={segmentList}
      translationTracks={[]}
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
  test('Check waits for a client-started session before submitting', async () => {
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

    expect(view.queryByText('Practice session is still starting.')).toBeNull()

    resolveSession!({ session })

    await waitFor(() => {
      expect(submitDictationAttemptMock).toHaveBeenCalledWith(
        session.id,
        expect.objectContaining({
          action: 'check',
          segmentId: segment.id,
        })
      )
    })
    expect(view.getByRole('status').textContent).toContain('Incorrect')
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
      expect(updateDictationSessionMock).toHaveBeenCalledWith(session.id, {
        status: 'completed',
      })
    })
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
    expect(updateDictationSessionMock).not.toHaveBeenCalled()
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
