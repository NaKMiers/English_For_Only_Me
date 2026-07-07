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
  markReady: () => void
  playFromMs: (startMs: number) => void
} {
  const playerRef = useRef<YoutubeDictationPlayerAdapter | null>(null)
  const stopIntervalRef = useRef<number | null>(null)
  const stopTimeoutRef = useRef<number | null>(null)
  const [hasPlayer, setHasPlayer] = useState(false)
  const [status, setStatus] = useState<YoutubePlayerStatus>('idle')
  const replayWindow = useMemo(
    () => getReplayWindow(timing),
    [timing.endMs, timing.startMs]
  )
  const canReplay = Boolean(replayWindow && hasPlayer)

  const clearStopTimer = useCallback(() => {
    if (stopIntervalRef.current) {
      window.clearInterval(stopIntervalRef.current)
      stopIntervalRef.current = null
    }

    if (stopTimeoutRef.current) {
      window.clearTimeout(stopTimeoutRef.current)
      stopTimeoutRef.current = null
    }
  }, [])

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
      player.playVideo()
      setStatus('playing')
    },
    [clearStopTimer, playbackSpeed]
  )

  const getCurrentTimeMs = useCallback(() => {
    const player = playerRef.current

    if (!player) return null

    return player.getCurrentTime() * 1000
  }, [])

  const markBuffering = useCallback(() => setStatus('buffering'), [])
  const markError = useCallback(() => setStatus('error'), [])
  const markReady = useCallback(
    () => setStatus(replayWindow ? 'ready' : 'missingTiming'),
    [replayWindow]
  )

  useEffect(() => {
    const player = playerRef.current

    player?.setPlaybackRate?.(playbackSpeed)
  }, [playbackSpeed])

  useEffect(() => {
    clearStopTimer()
    playerRef.current?.pauseVideo()
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
    markReady,
    message: getYoutubeReplayMessage({
      hasPlayer,
      replayWindow,
      status,
    }),
    playFromMs,
    replay,
    status,
  }
}
