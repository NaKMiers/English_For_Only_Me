'use client'

import { useCallback, useEffect, useId, useRef } from 'react'

import { cn } from '@/lib/utils'
import {
  useYoutubeDictationPlayer,
  type SegmentTiming,
  type YoutubeDictationPlayerAdapter,
  type YoutubeDictationPlayerState,
} from '@/modules/dictation/player/useYoutubeDictationPlayer'

interface YoutubeEvent {
  data?: number
  target: YoutubeDictationPlayerAdapter
}

interface YoutubePlayerConstructor {
  new (
    elementId: string,
    options: {
      events: {
        onError: () => void
        onReady: (event: YoutubeEvent) => void
        onStateChange: (event: YoutubeEvent) => void
      }
      height: string
      playerVars: {
        modestbranding: number
        playsinline: number
        rel: number
      }
      videoId: string
      width: string
    }
  ): YoutubeDictationPlayerAdapter
}

declare global {
  interface Window {
    YT?: {
      Player: YoutubePlayerConstructor
      PlayerState?: {
        BUFFERING: number
        ENDED: number
        PAUSED: number
        PLAYING: number
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface PlayerController {
  canReplay: boolean
  getCurrentTimeMs: () => number | null
  message: string
  playFromMs: (startMs: number) => void
  replay: () => void
  seekToMs: (startMs: number, options: { play: boolean }) => void
  status: YoutubeDictationPlayerState['status']
}

interface Props {
  className?: string
  hidden: boolean
  mockPlayer?: YoutubeDictationPlayerAdapter
  onControllerChange?: (controller: PlayerController) => void
  onHiddenChange: (hidden: boolean) => void
  playbackSpeed: number
  timing: SegmentTiming
  title: string
  youtubeVideoId: string | null
}

function loadYoutubeIframeApi() {
  if (typeof window === 'undefined') return Promise.reject()
  if (window.YT?.Player) return Promise.resolve(window.YT)

  return new Promise<NonNullable<Window['YT']>>((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    )

    window.onYouTubeIframeAPIReady = () => {
      if (window.YT?.Player) resolve(window.YT)
      else reject(new Error('YouTube API did not initialize.'))
    }

    if (existingScript) return

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => reject(new Error('YouTube API failed to load.'))
    document.body.appendChild(script)
  })
}

export function DictationYoutubePlayer({
  className,
  hidden,
  mockPlayer,
  onControllerChange,
  onHiddenChange,
  playbackSpeed,
  timing,
  title,
  youtubeVideoId,
}: Props) {
  const playerElementId = useId().replace(/:/g, '')
  const playerRef = useRef<YoutubeDictationPlayerAdapter | null>(null)
  const {
    attachPlayer,
    canReplay,
    getCurrentTimeMs,
    markBuffering,
    markError,
    markPaused,
    markPlaying,
    markReady,
    message,
    playFromMs,
    replay,
    seekToMs,
    status,
  } = useYoutubeDictationPlayer({ playbackSpeed, timing })
  const toggleHidden = useCallback(() => {
    onHiddenChange(!hidden)
  }, [hidden, onHiddenChange])

  const playerHandlersRef = useRef({
    attachPlayer,
    markBuffering,
    markError,
    markPaused,
    markPlaying,
    markReady,
  })

  useEffect(() => {
    playerHandlersRef.current = {
      attachPlayer,
      markBuffering,
      markError,
      markPaused,
      markPlaying,
      markReady,
    }
  }, [
    attachPlayer,
    markBuffering,
    markError,
    markPaused,
    markPlaying,
    markReady,
  ])

  useEffect(() => {
    onControllerChange?.({
      canReplay,
      getCurrentTimeMs,
      message,
      playFromMs,
      replay,
      seekToMs,
      status,
    })
  }, [
    canReplay,
    getCurrentTimeMs,
    message,
    onControllerChange,
    playFromMs,
    replay,
    seekToMs,
    status,
  ])

  useEffect(() => {
    if (mockPlayer) {
      playerRef.current = mockPlayer
      playerHandlersRef.current.attachPlayer(mockPlayer)
      return
    }

    if (!youtubeVideoId) {
      playerHandlersRef.current.attachPlayer(null)
      return
    }

    let isMounted = true

    loadYoutubeIframeApi()
      .then(yt => {
        if (!isMounted) return

        playerRef.current = new yt.Player(playerElementId, {
          height: '100%',
          width: '100%',
          videoId: youtubeVideoId,
          playerVars: {
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: event => {
              playerHandlersRef.current.attachPlayer(event.target)
              playerHandlersRef.current.markReady()
            },
            onStateChange: event => {
              const playerState = window.YT?.PlayerState

              // Mirror the real YouTube player state so the transcript and
              // segment counter follow the playhead no matter how playback
              // started - including the native play/pause button.
              if (event.data === playerState?.BUFFERING)
                playerHandlersRef.current.markBuffering()
              else if (event.data === playerState?.PLAYING)
                playerHandlersRef.current.markPlaying()
              else if (
                event.data === playerState?.PAUSED ||
                event.data === playerState?.ENDED
              )
                playerHandlersRef.current.markPaused()
            },
            onError: () => playerHandlersRef.current.markError(),
          },
        })
      })
      .catch(() => playerHandlersRef.current.markError())

    return () => {
      isMounted = false
    }
  }, [mockPlayer, playerElementId, youtubeVideoId])

  return (
    <section
      aria-label="Segment video player"
      className={cn(
        'border-manga-black bg-manga-white grid min-w-0 gap-3 border-2 p-3 shadow-[3px_3px_0_var(--manga-black)]',
        className
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-manga-ink-soft text-xs font-black uppercase">
          Video
        </span>
        <button
          type="button"
          onClick={toggleHidden}
          className="text-manga-ink-soft text-sm font-black underline underline-offset-4"
        >
          {hidden ? 'Show video' : 'Hide video'}
        </button>
      </div>
      <div
        className={cn(
          'border-manga-black bg-manga-white relative grid aspect-video overflow-hidden border-2',
          hidden && 'hidden'
        )}
      >
        {youtubeVideoId ? (
          <div
            id={playerElementId}
            title={title}
            className="h-full min-h-56 w-full"
          />
        ) : (
          <div className="grid min-h-56 place-items-center p-6 text-center font-black">
            YouTube metadata is missing for this video.
          </div>
        )}
      </div>

      {hidden ? (
        <div className="border-manga-black bg-manga-paper-soft border-2 p-4 text-sm leading-6 font-black">
          Video is hidden. Replay controls still work for timed segments.
        </div>
      ) : null}
    </section>
  )
}
