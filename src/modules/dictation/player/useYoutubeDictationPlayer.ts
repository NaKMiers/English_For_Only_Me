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
  markBuffering: () => void
  markError: () => void
  markReady: () => void
} {
  const playerRef = useRef<YoutubeDictationPlayerAdapter | null>(null)
  const stopTimerRef = useRef<number | null>(null)
  const [hasPlayer, setHasPlayer] = useState(false)
  const [status, setStatus] = useState<YoutubePlayerStatus>('idle')
  const replayWindow = useMemo(() => getReplayWindow(timing), [timing])
  const canReplay = Boolean(replayWindow && hasPlayer)

  const clearStopTimer = useCallback(() => {
    if (!stopTimerRef.current) return

    window.clearInterval(stopTimerRef.current)
    stopTimerRef.current = null
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

    stopTimerRef.current = window.setInterval(() => {
      if (player.getCurrentTime() < replayWindow.endSeconds) return

      player.pauseVideo()
      clearStopTimer()
      setStatus('ready')
    }, 120)
  }, [clearStopTimer, playbackSpeed, replayWindow])

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

  useEffect(
    () => () => {
      clearStopTimer()
    },
    [clearStopTimer]
  )

  return {
    attachPlayer,
    canReplay,
    markBuffering,
    markError,
    markReady,
    message: getYoutubeReplayMessage({
      hasPlayer,
      replayWindow,
      status,
    }),
    replay,
    status,
  }
}
