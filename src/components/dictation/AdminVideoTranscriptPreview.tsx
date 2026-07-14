'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DictationFullTranscript } from '@/components/dictation/DictationFullTranscript'
import { DictationTranslationBar } from '@/components/dictation/DictationTranslationBar'
import { DictationYoutubePlayer } from '@/components/dictation/DictationYoutubePlayer'
import type { YoutubePlayerStatus } from '@/modules/dictation/player/useYoutubeDictationPlayer'
import type { VideoSize } from '@/modules/dictation/preferences/dictationPreferences'
import {
  resolveCaptionForWindow,
  type CaptionCue,
} from '@/modules/dictation/translations/captionOverlap'
import type { DictationSegmentApiRecord } from '@/modules/dictation/types'

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
  status: YoutubePlayerStatus
}

interface Props {
  segments: DictationSegmentApiRecord[]
  title: string
  translationTracks?: TranslationTrack[]
  youtubeVideoId: string | null
}

interface TranslationTrack {
  cues: CaptionCue[]
  language: string
}

const DEFAULT_CONTROLLER: PlayerController = {
  canReplay: false,
  getCurrentTimeMs: () => null,
  message: 'YouTube player is loading.',
  pause: () => undefined,
  playFromMs: () => undefined,
  playSegment: () => undefined,
  replay: () => undefined,
  seekToMs: () => undefined,
  status: 'idle',
}

function findPlayingSegmentIndex(
  segments: DictationSegmentApiRecord[],
  timeMs: number
) {
  return segments.findIndex(
    segment =>
      segment.startMs !== null &&
      segment.endMs !== null &&
      timeMs >= segment.startMs &&
      timeMs < segment.endMs
  )
}

export function AdminVideoTranscriptPreview({
  segments,
  title,
  translationTracks = [],
  youtubeVideoId,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [activePlaybackIndex, setActivePlaybackIndex] = useState<number | null>(
    null
  )
  const [isRepeatingCaption, setIsRepeatingCaption] = useState(false)
  const [autoScrollTranscript, setAutoScrollTranscript] = useState(true)
  const [isVideoHidden, setIsVideoHidden] = useState(false)
  const [videoSize, setVideoSize] = useState<VideoSize>('normal')
  const [playerController, setPlayerController] =
    useState<PlayerController>(DEFAULT_CONTROLLER)
  const playerControllerRef = useRef<PlayerController>(DEFAULT_CONTROLLER)

  const safeCurrentIndex =
    segments.length > 0 ? Math.min(currentIndex, segments.length - 1) : 0
  const activeIndex = activePlaybackIndex ?? safeCurrentIndex
  const currentSegment = segments[safeCurrentIndex] ?? null
  const activeSegment = segments[activeIndex] ?? currentSegment
  const shouldContinuePlayback =
    playerController.status === 'playing' ||
    playerController.status === 'buffering'
  // null means "auto-pick the first available translation"; '' means the admin
  // explicitly chose no bilingual captions.
  const translationLanguage =
    selectedLanguage ?? translationTracks[0]?.language ?? ''
  const selectedTrack =
    translationTracks.find(track => track.language === translationLanguage) ??
    null
  const transcriptTranslations = useMemo(() => {
    const map: Record<string, string> = {}

    if (!selectedTrack) return map

    for (const segment of segments)
      map[segment.id] = resolveCaptionForWindow(
        selectedTrack.cues,
        segment.startMs,
        segment.endMs
      )

    return map
  }, [selectedTrack, segments])

  const handleControllerChange = useCallback((controller: PlayerController) => {
    playerControllerRef.current = controller
    setPlayerController(controller)
  }, [])

  useEffect(() => {
    if (playerController.status !== 'playing') return

    const intervalId = window.setInterval(() => {
      const timeMs = playerController.getCurrentTimeMs()

      if (timeMs === null) return

      const index = findPlayingSegmentIndex(segments, timeMs)

      if (index >= 0)
        setActivePlaybackIndex(previous =>
          previous === index ? previous : index
        )
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [playerController, segments])

  useEffect(() => {
    if (!isRepeatingCaption) return
    if (!activeSegment) return
    if (activeSegment.startMs === null || activeSegment.endMs === null) return

    playerControllerRef.current.playSegment(
      activeSegment.startMs,
      activeSegment.endMs,
      { loop: true }
    )

    return () => playerControllerRef.current.pause()
  }, [activeSegment, isRepeatingCaption])

  if (!currentSegment) return null

  return (
    <div className="grid min-w-0 gap-3">
      <DictationYoutubePlayer
        hidden={isVideoHidden}
        onControllerChange={handleControllerChange}
        onHiddenChange={setIsVideoHidden}
        onVideoSizeChange={setVideoSize}
        playbackSpeed={1}
        timing={{
          endMs: activeSegment?.endMs ?? null,
          startMs: activeSegment?.startMs ?? null,
        }}
        title={title}
        videoSize={videoSize}
        youtubeVideoId={youtubeVideoId}
      />

      <DictationTranslationBar
        className="w-full justify-self-end sm:w-fit"
        languages={translationTracks.map(track => track.language)}
        onChange={setSelectedLanguage}
        value={translationLanguage}
      />

      <DictationFullTranscript
        autoScroll={autoScrollTranscript}
        canRepeat={Boolean(
          activeSegment &&
          activeSegment.startMs !== null &&
          activeSegment.endMs !== null
        )}
        currentSegmentId={currentSegment.id}
        isActive
        isRepeating={isRepeatingCaption}
        onSelectSegment={segment => {
          const index = segments.findIndex(item => item.id === segment.id)

          if (index < 0) return

          setCurrentIndex(index)
          setActivePlaybackIndex(index)

          if (segment.startMs !== null)
            playerController.seekToMs(segment.startMs, {
              play: shouldContinuePlayback,
            })
        }}
        onToggleAutoScroll={() =>
          setAutoScrollTranscript(previous => !previous)
        }
        onToggleRepeat={() => setIsRepeatingCaption(previous => !previous)}
        playingSegmentId={activeSegment?.id ?? null}
        segments={segments}
        translations={transcriptTranslations}
      />
    </div>
  )
}
