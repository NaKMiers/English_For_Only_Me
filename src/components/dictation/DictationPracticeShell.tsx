'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { DictationAnswerBox } from '@/components/dictation/DictationAnswerBox'
import { DictationControls } from '@/components/dictation/DictationControls'
import { DictationFeedback } from '@/components/dictation/DictationFeedback'
import { DictationTranslation } from '@/components/dictation/DictationTranslation'
import { DictationTranscriptDrawer } from '@/components/dictation/DictationTranscriptDrawer'
import { DictationYoutubePlayer } from '@/components/dictation/DictationYoutubePlayer'
import { MangaButton } from '@/components/ui/MangaButton'
import {
  readDictationAnswerDrafts,
  useDictationPreferences,
  writeDictationAnswerDrafts,
  type DictationPracticePreferences,
} from '@/modules/dictation/preferences/dictationPreferences'
import { useDictationShortcuts } from '@/modules/dictation/preferences/shortcuts'
import type { YoutubePlayerStatus } from '@/modules/dictation/player/useYoutubeDictationPlayer'
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
  message: string
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
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false)
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>(() =>
    readDictationAnswerDrafts(video.id)
  )
  const replayCountRef = useRef<Record<string, number>>({})
  const segmentStartedAtRef = useRef(0)
  const [revealedSegmentIds, setRevealedSegmentIds] = useState<
    Record<string, boolean>
  >({})
  const [currentIndex, setCurrentIndex] = useState(() =>
    clampIndex(initialSession?.currentSegmentOrder ?? 0, segments.length)
  )
  const [playerController, setPlayerController] = useState<PlayerController>({
    canReplay: false,
    message: 'YouTube player is loading.',
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

  useEffect(() => {
    segmentStartedAtRef.current = Date.now()
  }, [currentSegment?.id])

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

  const submitAttempt = useCallback(
    async (action: DictationAttemptAction) => {
      if (!currentSegment) return

      if (!session) {
        setSessionError('Practice session is still starting.')
        return
      }

      setIsSubmittingAttempt(true)
      setDraftNotice(null)
      setSessionError(null)

      try {
        const response = await submitDictationAttemptApi(session.id, {
          action,
          idempotencyKey: createIdempotencyKey(),
          replayCountDelta: replayCountRef.current[currentSegment.id] ?? 0,
          segmentId: currentSegment.id,
          timeSpentMs: Math.max(0, Date.now() - segmentStartedAtRef.current),
          typedAnswer: currentAnswer,
        })
        const nextIndex = response.nextSegmentId
          ? segments.findIndex(segment => segment.id === response.nextSegmentId)
          : -1
        const shouldMoveToNext =
          nextIndex >= 0 && (response.attempt.isPassed || action === 'skip')

        setSession(response.session)
        setCurrentAttempt(response.attempt)
        if (response.attempt.isPassed || action === 'skip')
          setAnswerDrafts(currentDrafts => {
            const nextDrafts = { ...currentDrafts }

            delete nextDrafts[currentSegment.id]

            return nextDrafts
          })
        replayCountRef.current[currentSegment.id] = 0
        segmentStartedAtRef.current = Date.now()

        if (action === 'reveal')
          setRevealedSegmentIds(currentValues => ({
            ...currentValues,
            [currentSegment.id]: true,
          }))

        if (shouldMoveToNext) {
          setCurrentIndex(nextIndex)
          setDraftNotice(
            response.attempt.isPassed
              ? 'Accepted. Moving to the next sentence.'
              : 'Skipped. Moving to the next sentence.'
          )
        } else if (response.session.status === 'completed')
          setDraftNotice('Practice session completed.')
      } catch (error) {
        setSessionError(
          error instanceof Error
            ? error.message
            : 'Could not save this dictation attempt.'
        )
      } finally {
        setIsSubmittingAttempt(false)
      }
    },
    [currentAnswer, currentSegment, segments, session]
  )

  const checkDraft = useCallback(() => {
    void submitAttempt('check')
  }, [submitAttempt])

  const revealSegment = useCallback(() => {
    void submitAttempt('reveal')
  }, [submitAttempt])

  const skipSegment = useCallback(() => {
    void submitAttempt('skip')
  }, [submitAttempt])

  const shortcutHandlers = useMemo(
    () => ({
      check: checkDraft,
      next: goNext,
      previous: goPrevious,
      replay: playerController.replay,
      toggleVideo,
    }),
    [checkDraft, goNext, goPrevious, playerController.replay, toggleVideo]
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
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <section className="grid min-w-0 content-start gap-5">
        <MangaPanel
          eyebrow={sessionMode === 'resume' ? 'Resume' : 'Start'}
          title={video.title}
        >
          <DictationControls
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            canReplay={playerController.canReplay}
            currentIndex={currentIndex}
            isVideoHidden={preferences.isVideoHidden}
            onGoNext={goNext}
            onGoPrevious={goPrevious}
            onReplay={playerController.replay}
            onSpeedChange={changeSpeed}
            onToggleVideo={toggleVideo}
            playbackSpeed={preferences.playbackSpeed}
            replayMessage={playerController.message}
            showShortcuts={preferences.showShortcuts}
            totalSegments={segments.length}
          />
        </MangaPanel>

        <DictationYoutubePlayer
          hidden={preferences.isVideoHidden}
          onControllerChange={setPlayerController}
          onHiddenChange={hidden => {
            setPreferences(currentPreferences => ({
              ...currentPreferences,
              isVideoHidden: hidden,
            }))
            patchSession({ isVideoHidden: hidden })
          }}
          onReplay={() => {
            replayCountRef.current[currentSegment.id] =
              (replayCountRef.current[currentSegment.id] ?? 0) + 1
          }}
          playbackSpeed={preferences.playbackSpeed}
          timing={{
            endMs: currentSegment.endMs,
            startMs: currentSegment.startMs,
          }}
          title={video.title}
          youtubeVideoId={video.youtubeVideoId}
        />

        <DictationAnswerBox
          answer={currentAnswer}
          isSubmitting={isSubmittingAttempt}
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

        {draftNotice ? (
          <div
            role="status"
            className="border-manga-black bg-manga-paper-soft border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-black)]"
          >
            {draftNotice}
          </div>
        ) : null}
      </section>

      <aside className="grid min-w-0 content-start gap-5">
        <MangaPanel
          eyebrow="Session"
          title="Practice queue"
          action={
            <DictationTranscriptDrawer
              currentSegmentId={currentSegment.id}
              segments={segments}
            />
          }
        >
          <div className="grid gap-3">
            {segments.slice(0, 8).map(segment => (
              <QueueRow
                key={segment.id}
                title={segment.text}
                meta={
                  segment.startMs === null || segment.endMs === null
                    ? 'Untimed manual mode'
                    : `${(segment.startMs / 1000).toFixed(1)}s`
                }
                status={
                  segment.id === currentSegment.id
                    ? 'active'
                    : segment.order < currentSegment.order
                      ? 'done'
                      : 'queued'
                }
              />
            ))}
          </div>
        </MangaPanel>

        <MangaPanel
          eyebrow="Player state"
          title={playerController.status}
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            {sessionError ??
              (currentSegment.startMs === null || currentSegment.endMs === null
                ? 'Manual untimed mode: use the normal player and keep typing.'
                : 'Timed replay is ready when the YouTube player finishes loading.')}
          </p>
          <label className="flex items-center gap-3 text-sm font-black">
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
        </MangaPanel>
      </aside>
    </div>
  )
}
