'use client'

import { ChevronRight, Ratio } from 'lucide-react'
import Image from 'next/image'
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { preconnect } from 'react-dom'

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
  'border-manga-black inline-flex min-h-7 items-center rounded-control border-2 px-1.5 font-sans text-[0.7rem] font-black shadow-[2px_2px_0_var(--manga-black)]'

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

const YOUTUBE_ORIGIN = 'https://www.youtube.com'
const YOUTUBE_THUMBNAIL_ORIGIN = 'https://i.ytimg.com'
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
/** Upper bound on how long an idle-deferred player waits to be created. */
const PLAYER_IDLE_TIMEOUT_MS = 3000
/** Fallback delay where requestIdleCallback is missing (Safari). */
const PLAYER_IDLE_FALLBACK_MS = 1200
const ACTIVATION_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const

type PlayerCommand = (commands: PlayerCommands) => void
type PlayerCommands = Pick<
  PlayerController,
  'pause' | 'playFromMs' | 'playSegment' | 'replay' | 'seekToMs'
>

/**
 * Run `callback` once the main thread is idle (bounded by `timeoutMs`), or
 * after a short delay where requestIdleCallback is unavailable. Returns a
 * cancel function.
 */
export function scheduleWhenIdle(
  callback: () => void,
  {
    fallbackMs = PLAYER_IDLE_FALLBACK_MS,
    timeoutMs = PLAYER_IDLE_TIMEOUT_MS,
  }: { fallbackMs?: number; timeoutMs?: number } = {}
) {
  if (typeof window.requestIdleCallback === 'function') {
    const handle = window.requestIdleCallback(callback, { timeout: timeoutMs })

    return () => window.cancelIdleCallback(handle)
  }

  const handle = window.setTimeout(callback, fallbackMs)

  return () => window.clearTimeout(handle)
}

/**
 * Defer creating the player (and downloading the IFrame API) until the page
 * is idle or the learner first interacts, whichever comes first. `activate`
 * forces it immediately (a queued player command).
 */
function useDeferredActivation(enabled: boolean) {
  const [isActivated, setIsActivated] = useState(false)
  const activate = useCallback(() => setIsActivated(true), [])

  useEffect(() => {
    if (!enabled || isActivated) return

    const cancelIdle = scheduleWhenIdle(activate)
    const options = { capture: true, passive: true } as const

    for (const type of ACTIVATION_EVENTS)
      window.addEventListener(type, activate, options)

    return () => {
      cancelIdle()
      for (const type of ACTIVATION_EVENTS)
        window.removeEventListener(type, activate, options)
    }
  }, [activate, enabled, isActivated])

  return { activate, isActivated }
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

/**
 * hqdefault is 4:3 with the 16:9 frame letterboxed inside; object-cover on the
 * 16:9 box crops exactly to the picture, and it stays sharp at player size.
 */
export function getPlayerPlaceholderUrl(youtubeVideoId: string) {
  if (!YOUTUBE_ID_PATTERN.test(youtubeVideoId)) return null

  return `${YOUTUBE_THUMBNAIL_ORIGIN}/vi/${youtubeVideoId}/hqdefault.jpg`
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
  const usesYoutube = !mockPlayer && Boolean(youtubeVideoId)
  const { activate, isActivated } = useDeferredActivation(usesYoutube)
  // True once a real (or mock) player is attached. Until then, commands from
  // the shell are queued (latest wins) instead of being dropped.
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const isPlayerReadyRef = useRef(false)
  const pendingCommandRef = useRef<PlayerCommand | null>(null)

  if (usesYoutube) {
    preconnect(YOUTUBE_ORIGIN)
    preconnect(YOUTUBE_THUMBNAIL_ORIGIN)
  }

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
  const commandsRef = useRef<PlayerCommands>({
    pause,
    playFromMs,
    playSegment,
    replay,
    seekToMs,
  })

  useLayoutEffect(() => {
    commandsRef.current = { pause, playFromMs, playSegment, replay, seekToMs }
  }, [pause, playFromMs, playSegment, replay, seekToMs])

  // Re-created exactly when the hook's commands change (so callers' effects
  // re-run as before), but a command issued before the player exists is
  // queued and also creates the player right away.
  const queuedCommands = useMemo<PlayerCommands>(() => {
    const run = (command: PlayerCommand, fallback: () => void) => {
      if (isPlayerReadyRef.current || !usesYoutube) {
        fallback()
        return
      }

      pendingCommandRef.current = command
      activate()
    }

    return {
      pause: () => {
        if (isPlayerReadyRef.current || !usesYoutube) pause()
        else pendingCommandRef.current = null
      },
      playFromMs: startMs =>
        run(
          commands => commands.playFromMs(startMs),
          () => playFromMs(startMs)
        ),
      playSegment: (startMs, endMs, options) =>
        run(
          commands => commands.playSegment(startMs, endMs, options),
          () => playSegment(startMs, endMs, options)
        ),
      replay: () =>
        run(
          commands => commands.replay(),
          () => replay()
        ),
      seekToMs: (startMs, options) =>
        run(
          commands => commands.seekToMs(startMs, options),
          () => seekToMs(startMs, options)
        ),
    }
  }, [activate, pause, playFromMs, playSegment, replay, seekToMs, usesYoutube])

  const markPlayerReady = useCallback(() => {
    isPlayerReadyRef.current = true
    setIsPlayerReady(true)
  }, [])

  // Flush the queued command once the player is attached, through the latest
  // hook commands (which already see the attached player).
  useEffect(() => {
    if (!isPlayerReady) return

    const command = pendingCommandRef.current
    pendingCommandRef.current = null
    command?.(commandsRef.current)
  }, [isPlayerReady])

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
    markPlayerReady,
  })

  useEffect(() => {
    playerHandlersRef.current = {
      attachPlayer,
      markBuffering,
      markError,
      markPaused,
      markPlaying,
      markReady,
      markPlayerReady,
    }
  }, [
    attachPlayer,
    markBuffering,
    markError,
    markPaused,
    markPlaying,
    markPlayerReady,
    markReady,
  ])

  useEffect(() => {
    onControllerChange?.({
      canReplay,
      getCurrentTimeMs,
      message,
      ...queuedCommands,
      status,
    })
  }, [
    canReplay,
    getCurrentTimeMs,
    message,
    onControllerChange,
    queuedCommands,
    status,
  ])

  useEffect(() => {
    if (mockPlayer) {
      playerRef.current = mockPlayer
      playerHandlersRef.current.attachPlayer(mockPlayer)
      playerHandlersRef.current.markPlayerReady()
      return
    }

    if (!youtubeVideoId) {
      playerHandlersRef.current.attachPlayer(null)
      return
    }

    if (!isActivated) return

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
              playerHandlersRef.current.markPlayerReady()
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
  }, [isActivated, mockPlayer, playerElementId, youtubeVideoId])

  const placeholderThumbnailUrl =
    usesYoutube && !isPlayerReady && youtubeVideoId
      ? getPlayerPlaceholderUrl(youtubeVideoId)
      : null

  return (
    <section
      aria-label="Segment video player"
      className={cn(
        'border-manga-black bg-manga-white rounded-panel grid min-w-0 gap-2 border-2 p-2 shadow-[3px_3px_0_var(--manga-black)]',
        className
      )}
    >
      {/* The player element stays mounted while hidden so replay keeps working;
          a same-size placeholder covers it instead of collapsing the layout. */}
      <div className="border-manga-black bg-manga-white rounded-control relative grid aspect-video overflow-hidden border-2">
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
        {/* Until the deferred player is ready, the video's own thumbnail holds
            the frame (and is the practice page's LCP image). */}
        {placeholderThumbnailUrl ? (
          <Image
            src={placeholderThumbnailUrl}
            alt=""
            aria-hidden="true"
            fill
            unoptimized
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="pointer-events-none object-cover"
          />
        ) : null}
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
