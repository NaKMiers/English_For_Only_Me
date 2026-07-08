import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { setupDom } from '@/test/setupDom'

import {
  getReplayWindow,
  getYoutubeReplayMessage,
  useYoutubeDictationPlayer,
  type YoutubeDictationPlayerAdapter,
} from './useYoutubeDictationPlayer'

setupDom()

afterEach(() => {
  vi.useRealTimers()
})

describe('YouTube dictation player hook', () => {
  test('reports missing timing without trying to replay', () => {
    expect(getReplayWindow({ endMs: null, startMs: null })).toBeNull()
    expect(
      getYoutubeReplayMessage({
        hasPlayer: true,
        replayWindow: null,
        status: 'missingTiming',
      })
    ).toContain('no timestamps')
  })

  test('handles ready, buffering, error, and timestamp replay', () => {
    vi.useFakeTimers()

    let currentTime = 1
    const player: YoutubeDictationPlayerAdapter = {
      getCurrentTime: vi.fn(() => currentTime),
      pauseVideo: vi.fn(),
      playVideo: vi.fn(),
      seekTo: vi.fn(),
      setPlaybackRate: vi.fn(),
    }
    const { result } = renderHook(() =>
      useYoutubeDictationPlayer({
        playbackSpeed: 1.25,
        timing: {
          endMs: 2500,
          startMs: 1000,
        },
      })
    )

    act(() => result.current.attachPlayer(player))

    expect(result.current.status).toBe('ready')
    expect(result.current.canReplay).toBe(true)

    act(() => result.current.markBuffering())

    expect(result.current.status).toBe('buffering')

    act(() => result.current.replay())

    expect(player.seekTo).toHaveBeenCalledWith(1, true)
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1.25)
    expect(player.playVideo).toHaveBeenCalled()
    expect(result.current.status).toBe('playing')

    currentTime = 3

    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(player.pauseVideo).toHaveBeenCalled()
    expect(result.current.status).toBe('ready')

    act(() => result.current.markError())

    expect(result.current.status).toBe('error')
    expect(result.current.message).toContain('trouble loading')
  })

  test('seekToMs preserves the play/pause state passed by the caller', () => {
    const player: YoutubeDictationPlayerAdapter = {
      getCurrentTime: vi.fn(() => 0),
      pauseVideo: vi.fn(),
      playVideo: vi.fn(),
      seekTo: vi.fn(),
      setPlaybackRate: vi.fn(),
    }
    const { result } = renderHook(() =>
      useYoutubeDictationPlayer({
        playbackSpeed: 1,
        timing: { endMs: 5000, startMs: 1000 },
      })
    )

    act(() => result.current.attachPlayer(player))

    // Seeking while playing keeps the video playing from the new position.
    act(() => result.current.seekToMs(39000, { play: true }))

    expect(player.seekTo).toHaveBeenLastCalledWith(39, true)
    expect(player.playVideo).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('playing')

    // Seeking while paused moves the playhead but stays paused.
    act(() => result.current.seekToMs(28000, { play: false }))

    expect(player.seekTo).toHaveBeenLastCalledWith(28, true)
    expect(player.pauseVideo).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('ready')
  })
})
