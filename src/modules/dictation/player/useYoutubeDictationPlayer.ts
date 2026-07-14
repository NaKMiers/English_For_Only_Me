'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type YoutubePlayerStatus =
  'buffering' | 'error' | 'idle' | 'missingTiming' | 'playing' | 'ready'

export interface SegmentTiming {
  endMs: number | null
  startMs: number | null
}

export interface YoutubeDictationPlayerAdapter {
  getCurrentTime: () => number
  pauseVideo: () => void
  playVideo: () => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  setPlaybackRate?: (speed: number) => void
}

export interface YoutubeDictationPlayerState {
  canReplay: boolean
  message: string
  replay: () => void
  status: YoutubePlayerStatus
}

export function getReplayWindow(timing: SegmentTiming) {
  if (timing.startMs === null || timing.endMs === null) return null
  if (timing.endMs <= timing.startMs) return null

  return {
    endSeconds: timing.endMs / 1000,
    startSeconds: timing.startMs / 1000,
  }
}

export function getYoutubeReplayMessage({
  hasPlayer,
  replayWindow,
  status,
}: {
  hasPlayer: boolean
  replayWindow: ReturnType<typeof getReplayWindow>
  status: YoutubePlayerStatus
}) {
  if (!replayWindow)
    return 'This segment has no timestamps yet. Use normal video playback.'

  if (status === 'error')
    return 'The YouTube player had trouble loading. You can still type from the transcript.'

  if (!hasPlayer) return 'YouTube player is loading.'

  return 'Replay uses this segment timestamp window.'
}

export function useYoutubeDictationPlayer({
  playbackSpeed,
  timing,
}: {
  playbackSpeed: number
  timing: SegmentTiming
}): YoutubeDictationPlayerState & {
  attachPlayer: (player: YoutubeDictationPlayerAdapter | null) => void
  getCurrentTimeMs: () => number | null
  markBuffering: () => void
  markError: () => void
  markPaused: () => void
  markPlaying: () => void
  markReady: () => void
  pause: () => void
  playFromMs: (startMs: number) => void
  playSegment: (
    startMs: number,
    endMs: number,
    options?: { loop?: boolean }
  ) => void
  seekToMs: (startMs: number, options: { play: boolean }) => void
} {
  const playerRef = useRef<YoutubeDictationPlayerAdapter | null>(null)
  const stopIntervalRef = useRef<number | null>(null)
  const stopTimeoutRef = useRef<number | null>(null)
  const pauseAfterFirstPlayRef = useRef(false)
  const loopRef = useRef(false)
  const hasStartedPlaybackRef = useRef(false)
  const [hasPlayer, setHasPlayer] = useState(false)
  const [status, setStatus] = useState<YoutubePlayerStatus>('idle')
  const replayWindow = useMemo(
    () =>
      getReplayWindow({
        endMs: timing.endMs,
        startMs: timing.startMs,
      }),
    [timing.endMs, timing.startMs]
  )
  const canReplay = Boolean(replayWindow && hasPlayer)

  const clearStopTimer = useCallback(
    (options?: { keepFirstPlayPause?: boolean }) => {
      loopRef.current = false
      if (!options?.keepFirstPlayPause) pauseAfterFirstPlayRef.current = false

      if (stopIntervalRef.current) {
        window.clearInterval(stopIntervalRef.current)
        stopIntervalRef.current = null
      }

      if (stopTimeoutRef.current) {
        window.clearTimeout(stopTimeoutRef.current)
        stopTimeoutRef.current = null
      }
    },
    []
  )

  const attachPlayer = useCallback(
    (player: YoutubeDictationPlayerAdapter | null) => {
      playerRef.current = player
      setHasPlayer(Boolean(player))

      if (player && replayWindow) setStatus('ready')
      else if (player && !replayWindow) setStatus('missingTiming')
      else setStatus('idle')
    },
    [replayWindow]
  )

  const replay = useCallback(() => {
    const player = playerRef.current

    if (!player || !replayWindow) {
      setStatus('missingTiming')
      return
    }

    clearStopTimer()
    player.seekTo(replayWindow.startSeconds, true)
    player.setPlaybackRate?.(playbackSpeed)
    hasStartedPlaybackRef.current = true
    player.playVideo()
    setStatus('playing')

    const stopPlayback = () => {
      player.pauseVideo()
      clearStopTimer()
      setStatus('ready')
    }
    const windowDurationMs =
      ((replayWindow.endSeconds - replayWindow.startSeconds) * 1000) /
      Math.max(playbackSpeed, 0.25)

    stopIntervalRef.current = window.setInterval(() => {
      if (player.getCurrentTime() < replayWindow.endSeconds) return

      stopPlayback()
    }, 120)
    stopTimeoutRef.current = window.setTimeout(
      stopPlayback,
      windowDurationMs + 350
    )
  }, [clearStopTimer, playbackSpeed, replayWindow])

  const playFromMs = useCallback(
    (startMs: number) => {
      const player = playerRef.current

      if (!player) return

      // Continuous playback (no stop timer) so the transcript can follow along
      // like captions when the learner seeks from the full-transcript tab.
      clearStopTimer()
      player.seekTo(startMs / 1000, true)
      player.setPlaybackRate?.(playbackSpeed)
      hasStartedPlaybackRef.current = true
      player.playVideo()
      setStatus('playing')
    },
    [clearStopTimer, playbackSpeed]
  )

  // Play an arbitrary [startMs, endMs] window and stop at its end, or loop it
  // when `loop` is set. Used by the transcript "Repeat" button to replay/loop
  // the caption the learner is viewing (which may differ from the typed segment).
  const playSegment = useCallback(
    (startMs: number, endMs: number, options?: { loop?: boolean }) => {
      const player = playerRef.current
      const segmentWindow = getReplayWindow({ endMs, startMs })

      if (!player || !segmentWindow) {
        setStatus('missingTiming')
        return
      }

      const loop = Boolean(options?.loop)

      clearStopTimer()
      loopRef.current = loop
      player.seekTo(segmentWindow.startSeconds, true)
      player.setPlaybackRate?.(playbackSpeed)
      hasStartedPlaybackRef.current = true
      player.playVideo()
      setStatus('playing')

      const handleEnd = () => {
        if (loopRef.current) {
          player.seekTo(segmentWindow.startSeconds, true)
          hasStartedPlaybackRef.current = true
          player.playVideo()
          return
        }

        player.pauseVideo()
        clearStopTimer()
        setStatus('ready')
      }

      stopIntervalRef.current = window.setInterval(() => {
        if (player.getCurrentTime() < segmentWindow.endSeconds) return

        handleEnd()
      }, 120)

      if (!loop) {
        const windowDurationMs =
          ((segmentWindow.endSeconds - segmentWindow.startSeconds) * 1000) /
          Math.max(playbackSpeed, 0.25)

        stopTimeoutRef.current = window.setTimeout(
          handleEnd,
          windowDurationMs + 350
        )
      }
    },
    [clearStopTimer, playbackSpeed]
  )

  const pause = useCallback(() => {
    clearStopTimer()
    playerRef.current?.pauseVideo()
    setStatus(replayWindow ? 'ready' : 'missingTiming')
  }, [clearStopTimer, replayWindow])

  const seekToMs = useCallback(
    (startMs: number, options: { play: boolean }) => {
      const player = playerRef.current

      if (!player) return

      // Seek without the windowed stop timer so playback continues freely from
      // the new position. The caller passes the desired play state so the video
      // keeps playing or stays paused exactly as it was before the seek - even
      // from the cued/unstarted state, where a bare seekTo would auto-play.
      clearStopTimer()
      player.seekTo(startMs / 1000, true)
      player.setPlaybackRate?.(playbackSpeed)

      if (options.play) {
        hasStartedPlaybackRef.current = true
        player.playVideo()
        setStatus('playing')
        return
      }

      if (!hasStartedPlaybackRef.current) {
        // The YouTube iframe can go black when it receives seekTo + pauseVideo
        // before its first real play. Prime it from the user click, then pause
        // as soon as YouTube reports PLAYING so the requested paused-seek state
        // is preserved while a video frame is actually painted.
        pauseAfterFirstPlayRef.current = true
        player.playVideo()
        setStatus('buffering')
        return
      }

      player.pauseVideo()
      setStatus(replayWindow ? 'ready' : 'missingTiming')
    },
    [clearStopTimer, playbackSpeed, replayWindow]
  )

  const getCurrentTimeMs = useCallback(() => {
    const player = playerRef.current

    if (!player) return null

    return player.getCurrentTime() * 1000
  }, [])

  const markBuffering = useCallback(() => setStatus('buffering'), [])
  const markError = useCallback(() => setStatus('error'), [])
  const markPlaying = useCallback(() => {
    hasStartedPlaybackRef.current = true

    if (pauseAfterFirstPlayRef.current) {
      pauseAfterFirstPlayRef.current = false
      playerRef.current?.pauseVideo()
      setStatus(replayWindow ? 'ready' : 'missingTiming')
      return
    }

    setStatus('playing')
  }, [replayWindow])
  const markPaused = useCallback(
    () => setStatus(replayWindow ? 'ready' : 'missingTiming'),
    [replayWindow]
  )
  const markReady = useCallback(
    () => setStatus(replayWindow ? 'ready' : 'missingTiming'),
    [replayWindow]
  )

  useEffect(() => {
    const player = playerRef.current

    player?.setPlaybackRate?.(playbackSpeed)
  }, [playbackSpeed])

  useEffect(() => {
    clearStopTimer({ keepFirstPlayPause: true })
    if (!pauseAfterFirstPlayRef.current) playerRef.current?.pauseVideo()
  }, [clearStopTimer, replayWindow])

  useEffect(
    () => () => {
      clearStopTimer()
    },
    [clearStopTimer]
  )

  return {
    attachPlayer,
    canReplay,
    getCurrentTimeMs,
    markBuffering,
    markError,
    markPaused,
    markPlaying,
    markReady,
    message: getYoutubeReplayMessage({
      hasPlayer,
      replayWindow,
      status,
    }),
    pause,
    playFromMs,
    playSegment,
    replay,
    seekToMs,
    status,
  }
}
