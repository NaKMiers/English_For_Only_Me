'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { DictationAnswerBox } from '@/components/dictation/DictationAnswerBox'
import { DictationControls } from '@/components/dictation/DictationControls'
import { DictationFeedback } from '@/components/dictation/DictationFeedback'
import { DictationFullTranscript } from '@/components/dictation/DictationFullTranscript'
import { DictationTranslation } from '@/components/dictation/DictationTranslation'
import { DictationYoutubePlayer } from '@/components/dictation/DictationYoutubePlayer'
import { MangaButton } from '@/components/ui/MangaButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  buildDictationCorrection,
  createLocalDictationAttempt,
} from '@/modules/dictation/correction'
import type { YoutubePlayerStatus } from '@/modules/dictation/player/useYoutubeDictationPlayer'
import {
  readDictationAnswerDrafts,
  useDictationPreferences,
  writeDictationAnswerDrafts,
  type DictationPracticePreferences,
} from '@/modules/dictation/preferences/dictationPreferences'
import { useDictationShortcuts } from '@/modules/dictation/preferences/shortcuts'
import type {
  DictationAttemptAction,
  DictationAttemptApiRecord,
  DictationSegmentApiRecord,
  DictationSessionApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'
import { submitDictationAttemptApi } from '@/requests/dictationAttemptsApi'
import {
  startOrResumeDictationSessionApi,
  updateDictationSessionApi,
} from '@/requests/dictationSessionsApi'

interface PlayerController {
  canReplay: boolean
  getCurrentTimeMs: () => number | null
  message: string
  playFromMs: (startMs: number) => void
  replay: () => void
  status: YoutubePlayerStatus
}

interface Props {
  initialSession: DictationSessionApiRecord | null
  segments: DictationSegmentApiRecord[]
  video: DictationVideoApiRecord
}

function clampIndex(index: number, total: number) {
  if (total <= 0) return 0

  return Math.min(Math.max(index, 0), total - 1)
}

function getInitialPreferences(
  session: DictationSessionApiRecord | null
): Partial<DictationPracticePreferences> {
  if (!session) return {}

  return {
    isVideoHidden: session.isVideoHidden,
    playbackSpeed: session.playbackSpeed,
    showShortcuts: session.showShortcuts,
  }
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID()

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const PRACTICE_TAB_TRIGGER_CLASS_NAME =
  'border-manga-black text-manga-ink-soft bg-manga-white shadow-[2px_2px_0_var(--manga-black)] hover:bg-manga-paper-soft focus-visible:ring-manga-red/35 data-active:bg-manga-red data-active:text-manga-white data-active:shadow-[5px_5px_0_var(--manga-black)] data-active:-translate-x-[2px] data-active:-translate-y-[2px] !h-auto min-h-11 flex-1 rounded-none border-3 px-3 py-2 font-sans text-sm font-black transition-all after:hidden sm:flex-none'

export function DictationPracticeShell({
  initialSession,
  segments,
  video,
}: Props) {
  const [session, setSession] = useState(initialSession)
  const [sessionMode, setSessionMode] = useState<'resume' | 'start' | null>(
    initialSession ? 'resume' : null
  )
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [currentAttempt, setCurrentAttempt] =
    useState<DictationAttemptApiRecord | null>(null)
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>(() =>
    readDictationAnswerDrafts(video.id)
  )
  const [activeView, setActiveView] = useState<'practice' | 'transcript'>(
    'practice'
  )
  const [activePlaybackIndex, setActivePlaybackIndex] = useState<number | null>(
    null
  )
  const replayCountRef = useRef<Record<string, number>>({})
  const segmentStartedAtRef = useRef(0)
  const autoPlayedSegmentIdRef = useRef<string | null>(null)
  const persistQueueRef = useRef<Promise<unknown>>(Promise.resolve())
  const [revealedSegmentIds, setRevealedSegmentIds] = useState<
    Record<string, boolean>
  >({})
  const [currentIndex, setCurrentIndex] = useState(() =>
    clampIndex(initialSession?.currentSegmentOrder ?? 0, segments.length)
  )
  const [playerController, setPlayerController] = useState<PlayerController>({
    canReplay: false,
    getCurrentTimeMs: () => null,
    message: 'YouTube player is loading.',
    playFromMs: () => undefined,
    replay: () => undefined,
    status: 'idle',
  })
  const { preferences, setPreferences } = useDictationPreferences(
    getInitialPreferences(initialSession)
  )
  const currentSegment = segments[currentIndex] ?? null
  const currentAnswer = currentSegment
    ? (answerDrafts[currentSegment.id] ?? '')
    : ''
  const completedAttempt = currentAttempt
    ? currentAttempt.isPassed ||
      currentAttempt.action === 'reveal' ||
      currentAttempt.action === 'skip'
    : false
  const completedCurrentSegment =
    currentSegment?.attemptStatus === 'correct' ||
    currentSegment?.attemptStatus === 'revealed' ||
    currentSegment?.attemptStatus === 'skipped'
  const translationSegmentId = completedAttempt
    ? currentAttempt?.segmentId
    : completedCurrentSegment
      ? currentSegment?.id
      : null
  const isTranslationUnlocked = Boolean(
    (completedAttempt && currentAttempt?.segmentId) ||
    (completedCurrentSegment && currentSegment?.id)
  )
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < segments.length - 1
  // While the video is playing, the segment counter and transcript highlight
  // track the caption under the playhead; otherwise they follow the practice
  // cursor. Changing the practice cursor mid-playback would pause the video.
  const isPlaying = playerController.status === 'playing'
  const activePlaybackSegment =
    isPlaying && activePlaybackIndex !== null
      ? (segments[activePlaybackIndex] ?? null)
      : null
  const displayIndex = activePlaybackSegment
    ? activePlaybackIndex!
    : currentIndex

  const replayCurrentSegment = useCallback(() => {
    if (!currentSegment) return

    replayCountRef.current[currentSegment.id] =
      (replayCountRef.current[currentSegment.id] ?? 0) + 1
    playerController.replay()
  }, [currentSegment, playerController])

  useEffect(() => {
    segmentStartedAtRef.current = Date.now()
  }, [currentSegment?.id])

  useEffect(() => {
    // Auto-replay is a practice-mode behavior: it seeks to the current segment
    // and stops at its end. On the transcript tab we watch continuously, so
    // skip it there to avoid pausing at each caption boundary.
    if (activeView !== 'practice') return
    if (!currentSegment || !playerController.canReplay) return
    if (autoPlayedSegmentIdRef.current === currentSegment.id) return

    autoPlayedSegmentIdRef.current = currentSegment.id
    const timeoutId = window.setTimeout(() => {
      playerController.replay()
    }, 160)

    return () => window.clearTimeout(timeoutId)
  }, [activeView, currentSegment, playerController])

  useEffect(() => {
    if (playerController.status !== 'playing') return

    const intervalId = window.setInterval(() => {
      const timeMs = playerController.getCurrentTimeMs()

      if (timeMs === null) return

      const index = segments.findIndex(
        segment =>
          segment.startMs !== null &&
          segment.endMs !== null &&
          timeMs >= segment.startMs &&
          timeMs < segment.endMs
      )

      if (index >= 0)
        setActivePlaybackIndex(previous =>
          previous === index ? previous : index
        )
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [playerController, segments])

  useEffect(() => {
    writeDictationAnswerDrafts(video.id, answerDrafts)
  }, [answerDrafts, video.id])

  const patchSession = useCallback(
    (payload: Parameters<typeof updateDictationSessionApi>[1]) => {
      if (!session) return

      void updateDictationSessionApi(session.id, payload)
        .then(response => setSession(response.session))
        .catch(error =>
          setSessionError(
            error instanceof Error
              ? error.message
              : 'Could not save the practice cursor.'
          )
        )
    },
    [session]
  )

  useEffect(() => {
    if (session || segments.length === 0) return

    let isMounted = true

    startOrResumeDictationSessionApi({ videoId: video.id })
      .then(response => {
        if (!isMounted) return

        setSession(response.session)
        setSessionMode(response.mode ?? 'start')
        setCurrentIndex(
          clampIndex(response.session.currentSegmentOrder, segments.length)
        )
      })
      .catch(error => {
        if (!isMounted) return

        setSessionError(
          error instanceof Error
            ? error.message
            : 'Could not start this practice session.'
        )
      })

    return () => {
      isMounted = false
    }
  }, [segments.length, session, video.id])

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const safeIndex = clampIndex(nextIndex, segments.length)
      const segment = segments[safeIndex]

      if (!segment) return

      setCurrentIndex(safeIndex)
      setDraftNotice(null)
      setCurrentAttempt(null)
      patchSession({
        currentSegmentId: segment.id,
        currentSegmentOrder: segment.order,
      })
    },
    [patchSession, segments]
  )

  const goNext = useCallback(() => {
    if (canGoNext) goToIndex(currentIndex + 1)
  }, [canGoNext, currentIndex, goToIndex])

  const goPrevious = useCallback(() => {
    if (canGoPrevious) goToIndex(currentIndex - 1)
  }, [canGoPrevious, currentIndex, goToIndex])

  const toggleVideo = useCallback(() => {
    const nextValue = !preferences.isVideoHidden

    setPreferences(currentPreferences => ({
      ...currentPreferences,
      isVideoHidden: nextValue,
    }))
    patchSession({ isVideoHidden: nextValue })
  }, [patchSession, preferences.isVideoHidden, setPreferences])

  const changeSpeed = useCallback(
    (playbackSpeed: number) => {
      setPreferences(currentPreferences => ({
        ...currentPreferences,
        playbackSpeed,
      }))
      patchSession({ playbackSpeed })
    },
    [patchSession, setPreferences]
  )

  const runAttempt = useCallback(
    (action: DictationAttemptAction) => {
      if (!currentSegment) return

      if (!session) {
        setSessionError('Practice session is still starting.')
        return
      }

      const idempotencyKey = createIdempotencyKey()
      const replayCountDelta = replayCountRef.current[currentSegment.id] ?? 0
      const timeSpentMs = Math.max(0, Date.now() - segmentStartedAtRef.current)
      const typedAnswer = currentAnswer
      const correction = buildDictationCorrection({
        action,
        expectedText: currentSegment.text,
        typedAnswer,
      })
      const localAttempt = createLocalDictationAttempt({
        correction,
        expectedText: currentSegment.text,
        idempotencyKey,
        ownerId: currentSegment.ownerId,
        replayCountDelta,
        segmentId: currentSegment.id,
        sessionId: session.id,
        timeSpentMs,
        transcriptId: currentSegment.transcriptId,
        typedAnswer,
        videoId: currentSegment.videoId,
      })
      const shouldAdvance = correction.isPassed || action === 'skip'

      // Score on the client for instant feedback; the server recomputes the
      // identical correction when it persists the attempt in the background.
      setDraftNotice(null)
      setSessionError(null)

      if (shouldAdvance)
        setAnswerDrafts(currentDrafts => {
          const nextDrafts = { ...currentDrafts }

          delete nextDrafts[currentSegment.id]

          return nextDrafts
        })

      if (action === 'reveal')
        setRevealedSegmentIds(currentValues => ({
          ...currentValues,
          [currentSegment.id]: true,
        }))

      replayCountRef.current[currentSegment.id] = 0
      segmentStartedAtRef.current = Date.now()

      if (shouldAdvance && canGoNext) {
        setCurrentAttempt(null)
        setCurrentIndex(currentIndex + 1)
        setDraftNotice(
          correction.isPassed
            ? 'Accepted. Moving to the next sentence.'
            : 'Skipped. Moving to the next sentence.'
        )
      } else {
        setCurrentAttempt(localAttempt)
        if (shouldAdvance) setDraftNotice('Practice session completed.')
      }

      const segmentId = currentSegment.id

      // Serialize persistence so the server's segment-cursor guard sees attempts
      // in the same order the learner made them.
      persistQueueRef.current = persistQueueRef.current
        .catch(() => undefined)
        .then(() =>
          submitDictationAttemptApi(session.id, {
            action,
            idempotencyKey,
            replayCountDelta,
            segmentId,
            timeSpentMs,
            typedAnswer,
          })
        )
        .then(response => {
          setSession(response.session)
        })
        .catch(error => {
          setSessionError(
            error instanceof Error
              ? error.message
              : 'Could not save this dictation attempt.'
          )
        })
    },
    [canGoNext, currentAnswer, currentIndex, currentSegment, session]
  )

  const checkDraft = useCallback(() => {
    runAttempt('check')
  }, [runAttempt])

  const revealSegment = useCallback(() => {
    runAttempt('reveal')
  }, [runAttempt])

  const skipSegment = useCallback(() => {
    runAttempt('skip')
  }, [runAttempt])

  const shortcutHandlers = useMemo(
    () => ({
      check: checkDraft,
      next: goNext,
      previous: goPrevious,
      replay: replayCurrentSegment,
      toggleVideo,
    }),
    [checkDraft, goNext, goPrevious, replayCurrentSegment, toggleVideo]
  )

  useDictationShortcuts({
    enabled: preferences.showShortcuts,
    handlers: shortcutHandlers,
  })

  if (!currentSegment)
    return (
      <MangaPanel
        eyebrow="Practice"
        title="No segments ready"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          Build segments from the transcript before opening practice.
        </p>
        <MangaButton href="/dictation">Back To Dictation Lab</MangaButton>
      </MangaPanel>
    )

  return (
    <div className="mx-auto grid w-full max-w-6xl min-w-0 gap-4">
      <section className="border-manga-black bg-manga-white grid min-w-0 gap-3 border-3 p-3 shadow-[5px_5px_0_var(--manga-black)] sm:p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <span className="text-manga-red text-xs font-black tracking-normal uppercase">
              {sessionMode === 'resume' ? 'Resume dictation' : 'Dictation'}
            </span>
            <h1 className="font-sans text-2xl leading-tight font-black tracking-normal wrap-break-word sm:text-3xl">
              {video.title}
            </h1>
          </div>
          <DictationControls
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            canReplay={playerController.canReplay}
            currentIndex={displayIndex}
            isVideoHidden={preferences.isVideoHidden}
            onGoNext={goNext}
            onGoPrevious={goPrevious}
            onReplay={replayCurrentSegment}
            onSpeedChange={changeSpeed}
            onToggleVideo={toggleVideo}
            playbackSpeed={preferences.playbackSpeed}
            replayMessage={playerController.message}
            showShortcuts={preferences.showShortcuts}
            totalSegments={segments.length}
          />
        </div>

        <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <DictationYoutubePlayer
            className="self-start lg:sticky lg:top-4"
            hidden={preferences.isVideoHidden}
            onControllerChange={setPlayerController}
            onHiddenChange={hidden => {
              setPreferences(currentPreferences => ({
                ...currentPreferences,
                isVideoHidden: hidden,
              }))
              patchSession({ isVideoHidden: hidden })
            }}
            playbackSpeed={preferences.playbackSpeed}
            timing={{
              endMs: currentSegment.endMs,
              startMs: currentSegment.startMs,
            }}
            title={video.title}
            youtubeVideoId={video.youtubeVideoId}
          />

          <Tabs
            value={activeView}
            onValueChange={value =>
              setActiveView(value as 'practice' | 'transcript')
            }
            className="min-w-0 gap-3"
          >
            <TabsList
              variant="line"
              aria-label="Practice views"
              className="flex h-auto! w-full min-w-0 flex-wrap justify-start gap-2 rounded-none p-0"
            >
              <TabsTrigger
                value="practice"
                className={PRACTICE_TAB_TRIGGER_CLASS_NAME}
              >
                Listen &amp; Type
              </TabsTrigger>
              <TabsTrigger
                value="transcript"
                className={PRACTICE_TAB_TRIGGER_CLASS_NAME}
              >
                Full Transcript
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="practice"
              className="grid min-w-0 content-start gap-3"
            >
              <DictationAnswerBox
                answer={currentAnswer}
                onAnswerChange={answer =>
                  setAnswerDrafts(currentDrafts => ({
                    ...currentDrafts,
                    [currentSegment.id]: answer,
                  }))
                }
                onCheck={checkDraft}
                onReveal={revealSegment}
                onSkip={skipSegment}
                revealed={Boolean(revealedSegmentIds[currentSegment.id])}
                segmentText={currentSegment.text}
              />

              <DictationFeedback attempt={currentAttempt} />

              <DictationTranslation
                key={translationSegmentId ?? 'locked-translation'}
                isUnlocked={isTranslationUnlocked}
                segmentId={translationSegmentId ?? null}
              />
            </TabsContent>

            <TabsContent
              value="transcript"
              className="min-w-0"
            >
              <DictationFullTranscript
                currentSegmentId={currentSegment.id}
                isActive={activeView === 'transcript'}
                onSelectSegment={segment => {
                  if (segment.startMs !== null)
                    playerController.playFromMs(segment.startMs)
                }}
                playingSegmentId={activePlaybackSegment?.id ?? null}
                segments={segments}
              />
            </TabsContent>
          </Tabs>
        </div>

        {draftNotice ? (
          <div
            role="status"
            className="border-manga-black bg-manga-paper-soft border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-black)]"
          >
            {draftNotice}
          </div>
        ) : null}

        <footer className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-manga-ink-soft min-w-0 text-sm leading-6 font-semibold">
            {sessionError ??
              (currentSegment.startMs === null || currentSegment.endMs === null
                ? 'Untimed segment. Use the normal player controls, then type.'
                : `Sentence ${currentIndex + 1} of ${segments.length}. Press Ctrl to replay this sentence.`)}
          </p>
          <label className="flex items-center gap-2 text-sm font-black">
            <input
              type="checkbox"
              checked={preferences.showShortcuts}
              onChange={event => {
                const showShortcuts = event.target.checked

                setPreferences(currentPreferences => ({
                  ...currentPreferences,
                  showShortcuts,
                }))
                patchSession({ showShortcuts })
              }}
              className="border-manga-black size-5 border-2"
            />
            Show shortcut hints
          </label>
        </footer>
      </section>
    </div>
  )
}
