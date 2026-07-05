'use client'

import { Eye, EyeOff, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useId, useRef } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { IconButton } from '@/components/ui/IconButton'
import { MangaButton } from '@/components/ui/MangaButton'
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
      }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface PlayerController {
  canReplay: boolean
  message: string
  replay: () => void
  status: YoutubeDictationPlayerState['status']
}

interface Props {
  className?: string
  hidden: boolean
  mockPlayer?: YoutubeDictationPlayerAdapter
  onControllerChange?: (controller: PlayerController) => void
  onHiddenChange: (hidden: boolean) => void
  onReplay?: () => void
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
  onReplay,
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
    markBuffering,
    markError,
    markReady,
    message,
    replay,
    status,
  } = useYoutubeDictationPlayer({ playbackSpeed, timing })
  const replayWithTelemetry = useCallback(() => {
    onReplay?.()
    replay()
  }, [onReplay, replay])

  useEffect(() => {
    onControllerChange?.({
      canReplay,
      message,
      replay: replayWithTelemetry,
      status,
    })
  }, [canReplay, message, onControllerChange, replayWithTelemetry, status])

  useEffect(() => {
    if (mockPlayer) {
      playerRef.current = mockPlayer
      attachPlayer(mockPlayer)
      return
    }

    if (!youtubeVideoId) {
      attachPlayer(null)
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
              attachPlayer(event.target)
              markReady()
            },
            onStateChange: event => {
              if (event.data === window.YT?.PlayerState?.BUFFERING)
                markBuffering()
            },
            onError: () => markError(),
          },
        })
      })
      .catch(() => markError())

    return () => {
      isMounted = false
    }
  }, [
    attachPlayer,
    markBuffering,
    markError,
    markReady,
    mockPlayer,
    playerElementId,
    youtubeVideoId,
  ])

  return (
    <MangaPanel
      eyebrow="YouTube replay"
      title="Segment player"
      className={className}
      action={
        <IconButton
          label={hidden ? 'Show video' : 'Hide video'}
          onClick={() => onHiddenChange(!hidden)}
        >
          {hidden ? (
            <Eye
              aria-hidden="true"
              className="size-5"
            />
          ) : (
            <EyeOff
              aria-hidden="true"
              className="size-5"
            />
          )}
        </IconButton>
      }
    >
      <div
        className={cn(
          'border-manga-black bg-manga-white relative grid min-h-64 overflow-hidden border-3 shadow-[4px_4px_0_var(--manga-black)]',
          hidden && 'hidden'
        )}
      >
        {youtubeVideoId ? (
          <div
            id={playerElementId}
            title={title}
            className="min-h-64 w-full"
          />
        ) : (
          <div className="grid min-h-64 place-items-center p-6 text-center font-black">
            YouTube metadata is missing for this video.
          </div>
        )}
      </div>

      {hidden ? (
        <div className="border-manga-black bg-manga-paper-soft border-2 p-4 text-sm leading-6 font-black">
          Video is hidden. Replay controls still work for timed segments.
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <MangaButton
          type="button"
          disabled={!canReplay}
          onClick={replayWithTelemetry}
          icon={
            <RotateCcw
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          Replay Sentence
        </MangaButton>
        <MangaButton
          type="button"
          tone="paper"
          disabled={!canReplay}
          onClick={replayWithTelemetry}
          icon={
            <Play
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          Play Window
        </MangaButton>
        <span
          role="status"
          className="border-manga-black bg-manga-white min-h-10 min-w-0 border-2 px-3 py-2 text-sm font-black break-words shadow-[2px_2px_0_var(--manga-black)]"
        >
          {message}
        </span>
      </div>
    </MangaPanel>
  )
}
