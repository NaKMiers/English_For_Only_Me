'use client'

import { ChevronRight, Ratio } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import {
  useYoutubeDictationPlayer,
  type SegmentTiming,
  type YoutubeDictationPlayerAdapter,
  type YoutubeDictationPlayerState,
} from '@/modules/dictation/player/useYoutubeDictationPlayer'
import {
  VIDEO_SIZE_OPTIONS,
  type VideoSize,
} from '@/modules/dictation/preferences/dictationPreferences'

const SIZE_BUTTON_CLASS_NAME =
  'border-manga-black inline-flex min-h-7 items-center border-2 px-1.5 font-sans text-[0.7rem] font-black shadow-[2px_2px_0_var(--manga-black)]'

const VIDEO_SIZE_LABEL: Record<VideoSize, string> = {
  small: 'Small',
  normal: 'Normal',
  large: 'Large',
  max: 'Max',
}

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
  pause: () => void
  playFromMs: (startMs: number) => void
  playSegment: (
    startMs: number,
    endMs: number,
    options?: { loop?: boolean }
  ) => void
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
  /**
   * Omit to drop the size picker row entirely. Practice does that - size moved
   * into the toolbar settings menu - while admin preview still picks it here.
   */
  onVideoSizeChange?: (size: VideoSize) => void
  playbackSpeed: number
  timing: SegmentTiming
  title: string
  videoSize: VideoSize
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
  onVideoSizeChange,
  playbackSpeed,
  timing,
  title,
  videoSize,
  youtubeVideoId,
}: Props) {
  const playerElementId = useId().replace(/:/g, '')
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false)
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
    pause,
    playFromMs,
    playSegment,
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
      pause,
      playFromMs,
      playSegment,
      replay,
      seekToMs,
      status,
    })
  }, [
    canReplay,
    getCurrentTimeMs,
    message,
    onControllerChange,
    pause,
    playFromMs,
    playSegment,
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
        'border-manga-black bg-manga-white grid min-w-0 gap-2 border-2 p-2 shadow-[3px_3px_0_var(--manga-black)]',
        className
      )}
    >
      {/* The player element stays mounted while hidden so replay keeps working;
          a same-size placeholder covers it instead of collapsing the layout. */}
      <div className="border-manga-black bg-manga-white relative grid aspect-video overflow-hidden border-2">
        {youtubeVideoId ? (
          <div
            id={playerElementId}
            title={title}
            className="h-full w-full"
          />
        ) : (
          <div className="grid min-h-40 place-items-center p-4 text-center text-sm font-black">
            YouTube metadata is missing for this video.
          </div>
        )}
        {hidden ? (
          <div
            aria-hidden="true"
            className="bg-manga-paper-soft text-manga-ink-soft absolute inset-0 grid place-items-center p-4 text-center text-sm leading-6 font-black"
          >
            Video hidden - listen and type. Replay still works for timed
            segments.
          </div>
        ) : null}
      </div>

      {/* Only rendered when the caller owns size here (admin preview). Practice
          drops this row: size lives in the toolbar settings menu and hiding the
          video is a toolbar button, so the frame ends at the video. */}
      {onVideoSizeChange ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <button
            type="button"
            aria-expanded={isSizeMenuOpen}
            onClick={() => setIsSizeMenuOpen(open => !open)}
            className={cn(
              SIZE_BUTTON_CLASS_NAME,
              'bg-manga-white text-manga-black hover:bg-manga-paper-soft gap-1'
            )}
          >
            <Ratio
              aria-hidden="true"
              className="size-3.5"
            />
            {VIDEO_SIZE_LABEL[videoSize]}
            <ChevronRight
              aria-hidden="true"
              className={cn(
                'size-3.5 transition-transform',
                isSizeMenuOpen && 'rotate-90'
              )}
            />
          </button>
          {isSizeMenuOpen
            ? VIDEO_SIZE_OPTIONS.map(size => (
                <button
                  key={size}
                  type="button"
                  aria-pressed={videoSize === size}
                  onClick={() => {
                    onVideoSizeChange(size)
                    setIsSizeMenuOpen(false)
                  }}
                  className={cn(
                    SIZE_BUTTON_CLASS_NAME,
                    videoSize === size
                      ? 'bg-manga-black text-manga-white'
                      : 'bg-manga-white text-manga-black hover:bg-manga-paper-soft'
                  )}
                >
                  {VIDEO_SIZE_LABEL[size]}
                </button>
              ))
            : null}
          <button
            type="button"
            onClick={toggleHidden}
            className="text-manga-ink-soft ml-auto text-xs font-black underline underline-offset-4"
          >
            {hidden ? 'Show video' : 'Hide video'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
