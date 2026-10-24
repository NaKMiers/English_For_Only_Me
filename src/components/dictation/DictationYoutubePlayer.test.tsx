import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { YoutubeDictationPlayerAdapter } from '@/modules/dictation/player/useYoutubeDictationPlayer'

import {
  DictationYoutubePlayer,
  getPlayerPlaceholderUrl,
  scheduleWhenIdle,
} from './DictationYoutubePlayer'

type Controller = Parameters<
  NonNullable<
    Parameters<typeof DictationYoutubePlayer>[0]['onControllerChange']
  >
>[0]

interface PlayerOptions {
  events: {
    onReady: (event: { target: YoutubeDictationPlayerAdapter }) => void
  }
  videoId: string
}

const VIDEO_ID = 'dQw4w9WgXcQ'
let constructed: PlayerOptions[] = []
let idleCallbacks: Array<() => void> = []

function fakeAdapter(): YoutubeDictationPlayerAdapter {
  return {
    getCurrentTime: vi.fn(() => 0),
    pauseVideo: vi.fn(),
    playVideo: vi.fn(),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
  }
}

function renderPlayer() {
  let controller: Controller | null = null
  const view = render(
    <DictationYoutubePlayer
      hidden={false}
      onControllerChange={next => {
        controller = next
      }}
      onHiddenChange={() => undefined}
      playbackSpeed={1}
      timing={{ endMs: 4000, startMs: 2000 }}
      title="Lesson"
      videoSize="normal"
      youtubeVideoId={VIDEO_ID}
    />
  )

  return { controller: () => controller!, view }
}

async function readyPlayer(adapter: YoutubeDictationPlayerAdapter) {
  // Let the IFrame API promise resolve and the player get constructed.
  await act(async () => undefined)
  expect(constructed).toHaveLength(1)
  act(() => constructed[0].events.onReady({ target: adapter }))
}

beforeEach(() => {
  constructed = []
  idleCallbacks = []
  window.YT = {
    Player: class {
      constructor(_elementId: string, options: PlayerOptions) {
        constructed.push(options)
      }
    } as unknown as NonNullable<Window['YT']>['Player'],
    PlayerState: { BUFFERING: 3, ENDED: 0, PAUSED: 2, PLAYING: 1 },
  }
  window.requestIdleCallback = vi.fn((callback: () => void) => {
    idleCallbacks.push(callback)
    return idleCallbacks.length
  }) as unknown as typeof window.requestIdleCallback
  window.cancelIdleCallback = vi.fn()
})

afterEach(() => {
  delete window.YT
})

describe('DictationYoutubePlayer deferred loading', () => {
  test('shows the thumbnail and creates no player before idle or input', () => {
    const { view } = renderPlayer()

    const placeholder = view.container.querySelector('img')
    expect(placeholder?.getAttribute('src')).toBe(
      getPlayerPlaceholderUrl(VIDEO_ID)
    )
    expect(constructed).toHaveLength(0)
  })

  test('creates the player once the page is idle', async () => {
    const { view } = renderPlayer()

    act(() => idleCallbacks.forEach(callback => callback()))
    await readyPlayer(fakeAdapter())

    expect(constructed[0].videoId).toBe(VIDEO_ID)
    expect(view.container.querySelector('img')).toBeNull()
  })

  test('creates the player on the first user interaction', async () => {
    renderPlayer()

    fireEvent.pointerDown(window)
    await act(async () => undefined)

    expect(constructed).toHaveLength(1)
  })

  test('queues a command issued before the player is ready', async () => {
    const adapter = fakeAdapter()
    const { controller } = renderPlayer()

    act(() => controller().replay())
    expect(adapter.playVideo).not.toHaveBeenCalled()

    await readyPlayer(adapter)

    expect(adapter.seekTo).toHaveBeenCalledWith(2, true)
    expect(adapter.playVideo).toHaveBeenCalledTimes(1)
    expect(controller().status).toBe('playing')
  })

  test('a pause before ready cancels the queued command', async () => {
    const adapter = fakeAdapter()
    const { controller } = renderPlayer()

    act(() => {
      controller().playSegment(2000, 4000)
      controller().pause()
    })
    await readyPlayer(adapter)

    expect(adapter.playVideo).not.toHaveBeenCalled()
  })

  test('a mock player is ready immediately with no deferral', () => {
    const adapter = fakeAdapter()
    let controller: Controller | null = null

    render(
      <DictationYoutubePlayer
        hidden={false}
        mockPlayer={adapter}
        onControllerChange={next => {
          controller = next
        }}
        onHiddenChange={() => undefined}
        playbackSpeed={1}
        timing={{ endMs: 4000, startMs: 2000 }}
        title="Lesson"
        videoSize="normal"
        youtubeVideoId={VIDEO_ID}
      />
    )

    expect(controller!.canReplay).toBe(true)
    act(() => controller!.replay())
    expect(adapter.playVideo).toHaveBeenCalledTimes(1)
  })
})

describe('scheduleWhenIdle', () => {
  test('falls back to a timeout without requestIdleCallback', () => {
    vi.useFakeTimers()
    const original = window.requestIdleCallback
    // @ts-expect-error simulate Safari, which has no requestIdleCallback
    delete window.requestIdleCallback
    const callback = vi.fn()

    scheduleWhenIdle(callback, { fallbackMs: 500 })
    vi.advanceTimersByTime(499)
    expect(callback).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(callback).toHaveBeenCalledTimes(1)

    const cancel = scheduleWhenIdle(callback, { fallbackMs: 500 })
    cancel()
    vi.advanceTimersByTime(1000)
    expect(callback).toHaveBeenCalledTimes(1)

    window.requestIdleCallback = original
    vi.useRealTimers()
  })
})
