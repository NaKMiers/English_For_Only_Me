'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { DictationControls } from '@/components/dictation/DictationControls'
import { DictationFullTranscript } from '@/components/dictation/DictationFullTranscript'
import { DictationPracticeHeader } from '@/components/dictation/DictationPracticeHeader'
import { DictationTranslation } from '@/components/dictation/DictationTranslation'
import { DictationYoutubePlayer } from '@/components/dictation/DictationYoutubePlayer'
import {
  GuidedAnswerInput,
  type GuidedStatus,
} from '@/components/dictation/GuidedAnswerInput'
import { MangaButton } from '@/components/ui/MangaButton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  buildCharCorrection,
  buildDictationCorrection,
  createLocalDictationAttempt,
  type CharCorrectionResult,
} from '@/modules/dictation/correction'
import type { YoutubePlayerStatus } from '@/modules/dictation/player/useYoutubeDictationPlayer'
import {
  resolveCaptionForWindow,
  type CaptionCue,
} from '@/modules/dictation/translations/captionOverlap'
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
  seekToMs: (startMs: number, options: { play: boolean }) => void
  status: YoutubePlayerStatus
}

interface TranslationTrack {
  cues: CaptionCue[]
  language: string
}

interface Props {
  initialSession: DictationSessionApiRecord | null
  segments: DictationSegmentApiRecord[]
  translationTracks: TranslationTrack[]
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
  'border-manga-black text-manga-ink-soft bg-manga-white shadow-[2px_2px_0_var(--manga-black)] hover:bg-manga-paper-soft focus-visible:ring-manga-red/35 data-active:bg-manga-red! data-active:text-manga-white! data-active:shadow-[5px_5px_0_var(--manga-black)]! data-active:-translate-x-[2px] data-active:-translate-y-[2px] !h-auto min-h-11 flex-1 rounded-none border-3 px-3 py-2 font-sans text-sm font-black transition-all after:hidden sm:flex-none'

export function DictationPracticeShell({
  initialSession,
  segments,
  translationTracks,
  video,
}: Props) {
  const [session, setSession] = useState(initialSession)
  const [selectedLanguage, setSelectedLanguage] = useState(
    () => translationTracks[0]?.language ?? ''
  )
  const [sessionMode, setSessionMode] = useState<'resume' | 'start' | null>(
    initialSession ? 'resume' : null
  )
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [currentAttempt, setCurrentAttempt] =
    useState<DictationAttemptApiRecord | null>(null)
  // Char-level correction is captured at Check time and frozen, so rewriting the
  // draft to the corrected prefix (caretValue) does not re-run the alignment and
  // move the boundary underneath the learner.
  const [charCorrection, setCharCorrection] =
    useState<CharCorrectionResult | null>(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
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
  const [currentIndex, setCurrentIndex] = useState(() =>
    clampIndex(initialSession?.currentSegmentOrder ?? 0, segments.length)
  )
  const [playerController, setPlayerController] = useState<PlayerController>({
    canReplay: false,
    getCurrentTimeMs: () => null,
    message: 'YouTube player is loading.',
    playFromMs: () => undefined,
    replay: () => undefined,
    seekToMs: () => undefined,
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
  const selectedTrack =
    translationTracks.find(track => track.language === selectedLanguage) ?? null
  const translationSegment = translationSegmentId
    ? (segments.find(segment => segment.id === translationSegmentId) ?? null)
    : null
  const translationText =
    isTranslationUnlocked && selectedTrack && translationSegment
      ? resolveCaptionForWindow(
          selectedTrack.cues,
          translationSegment.startMs,
          translationSegment.endMs
        )
      : ''
  // Bilingual full-transcript view: every sentence's caption in the selected
  // language, matched by time overlap. Shown regardless of the effort gate since
  // the full transcript already reveals everything.
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
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < segments.length - 1
  const isPlaying = playerController.status === 'playing'
  // The segment counter and transcript highlight track a single "active caption"
  // so they stay in sync with the video. On the transcript tab the learner
  // scrubs playback freely, so the active caption follows the playhead (updated
  // while playing) and any manual seek. On the practice tab it follows the
  // dictation cursor, since navigating there swaps the segment being typed.
  const activeCaptionIndex =
    activeView === 'transcript'
      ? (activePlaybackIndex ?? currentIndex)
      : currentIndex
  const activeCaptionSegment = segments[activeCaptionIndex] ?? null
  const displayIndex = activeCaptionIndex
  const canGoToPreviousCaption = activeCaptionIndex > 0
  const canGoToNextCaption = activeCaptionIndex < segments.length - 1

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
    if (!hasStarted) return
    if (!currentSegment || !playerController.canReplay) return
    if (autoPlayedSegmentIdRef.current === currentSegment.id) return

    autoPlayedSegmentIdRef.current = currentSegment.id
    const timeoutId = window.setTimeout(() => {
      playerController.replay()
    }, 160)

    return () => window.clearTimeout(timeoutId)
  }, [activeView, currentSegment, hasStarted, playerController])

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
      setCharCorrection(null)
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

  // Transcript-tab navigation: seek the video to a caption and mark it active,
  // without touching the dictation cursor (which would swap the replay window
  // and pause the video). Playback continues or stays paused exactly as it was.
  const goToCaption = useCallback(
    (nextIndex: number) => {
      const safeIndex = clampIndex(nextIndex, segments.length)
      const segment = segments[safeIndex]

      if (!segment) return

      setActivePlaybackIndex(safeIndex)

      if (segment.startMs !== null)
        playerController.seekToMs(segment.startMs, { play: isPlaying })
    },
    [isPlaying, playerController, segments]
  )

  const handleControlsGoPrevious = useCallback(() => {
    if (activeView === 'transcript') goToCaption(activeCaptionIndex - 1)
    else goPrevious()
  }, [activeCaptionIndex, activeView, goToCaption, goPrevious])

  const handleControlsGoNext = useCallback(() => {
    if (activeView === 'transcript') goToCaption(activeCaptionIndex + 1)
    else goNext()
  }, [activeCaptionIndex, activeView, goNext, goToCaption])

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
      // Word-level result feeds analytics/persistence; char-level result drives
      // the guided display. Same normalized inputs, two representations (F1).
      const correction = buildDictationCorrection({
        action,
        expectedText: currentSegment.text,
        typedAnswer,
      })
      const charResult = buildCharCorrection({
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

      // Score on the client for instant feedback; the server recomputes the
      // identical correction when it persists the attempt in the background.
      setDraftNotice(null)
      setSessionError(null)

      // Wrong Check: rewrite the draft to the corrected prefix so the caret jumps
      // to the exact fix point (GuidedAnswerInput moves it to the end). Correct /
      // reveal / skip leave the draft alone; advancing clears it.
      if (
        action === 'check' &&
        !correction.isPassed &&
        charResult.caretValue !== typedAnswer
      )
        setAnswerDrafts(currentDrafts => ({
          ...currentDrafts,
          [currentSegment.id]: charResult.caretValue,
        }))

      replayCountRef.current[currentSegment.id] = 0
      segmentStartedAtRef.current = Date.now()

      // Feedback is shown in place; the learner advances with Next / Enter.
      setCurrentAttempt(localAttempt)
      setCharCorrection(charResult)

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
    [currentAnswer, currentSegment, session]
  )

  // A resolved attempt (passed, revealed, or skipped) shows the answer and waits
  // for the learner to advance with Next / Enter.
  const attemptResolved = currentAttempt
    ? currentAttempt.isPassed ||
      currentAttempt.action === 'reveal' ||
      currentAttempt.action === 'skip'
    : false
  const guidedStatus: GuidedStatus = !currentAttempt
    ? 'idle'
    : currentAttempt.isPassed
      ? 'correct'
      : currentAttempt.action === 'reveal' || currentAttempt.action === 'skip'
        ? 'revealed'
        : 'incorrect'

  const advanceAfterAttempt = useCallback(() => {
    if (currentSegment)
      setAnswerDrafts(currentDrafts => {
        const nextDrafts = { ...currentDrafts }

        delete nextDrafts[currentSegment.id]

        return nextDrafts
      })

    if (canGoNext) goToIndex(currentIndex + 1)
    else {
      setCurrentAttempt(null)
      setCharCorrection(null)
      setIsCompleted(true)
    }
  }, [canGoNext, currentIndex, currentSegment, goToIndex])

  const retryCurrent = useCallback(() => {
    if (currentSegment)
      setAnswerDrafts(currentDrafts => ({
        ...currentDrafts,
        [currentSegment.id]: '',
      }))

    setCurrentAttempt(null)
    setCharCorrection(null)
    replayCurrentSegment()
  }, [currentSegment, replayCurrentSegment])

  const handleRepeat = useCallback(() => {
    setIsCompleted(false)
    setCurrentAttempt(null)
    setCharCorrection(null)
    goToIndex(0)
  }, [goToIndex])

  // Check / Enter: grade the draft, or advance once the answer is resolved.
  const checkDraft = useCallback(() => {
    if (attemptResolved) advanceAfterAttempt()
    else runAttempt('check')
  }, [advanceAfterAttempt, attemptResolved, runAttempt])

  // Esc: retry after a correct answer, otherwise reveal the full answer.
  const revealSegment = useCallback(() => {
    if (currentAttempt?.isPassed) retryCurrent()
    else runAttempt('reveal')
  }, [currentAttempt, retryCurrent, runAttempt])

  // Skip button: reveal the answer (recorded as a skip) and wait for Next.
  const skipSegment = useCallback(() => {
    if (attemptResolved) advanceAfterAttempt()
    else runAttempt('skip')
  }, [advanceAfterAttempt, attemptResolved, runAttempt])

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
        <DictationPracticeHeader
          eyebrow={sessionMode === 'resume' ? 'Resume dictation' : 'Dictation'}
          title={video.title}
          translationLanguages={translationTracks.map(track => track.language)}
          translationLanguage={selectedLanguage}
          onTranslationLanguageChange={setSelectedLanguage}
        />

        <DictationControls
          canGoNext={canGoToNextCaption}
          canGoPrevious={canGoToPreviousCaption}
          canReplay={playerController.canReplay}
          currentIndex={displayIndex}
          isVideoHidden={preferences.isVideoHidden}
          onGoNext={handleControlsGoNext}
          onGoPrevious={handleControlsGoPrevious}
          onReplay={replayCurrentSegment}
          onSpeedChange={changeSpeed}
          onToggleVideo={toggleVideo}
          playbackSpeed={preferences.playbackSpeed}
          totalSegments={segments.length}
        />

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
              {isCompleted ? (
                <MangaPanel
                  eyebrow="Done"
                  title="You have completed this exercise, good job!"
                >
                  <div className="flex flex-wrap gap-2">
                    <MangaButton
                      href="/dictation"
                      icon={undefined}
                    >
                      Next Exercise
                    </MangaButton>
                    <MangaButton
                      type="button"
                      tone="paper"
                      onClick={handleRepeat}
                    >
                      Repeat this exercise
                    </MangaButton>
                  </div>
                  <MangaButton
                    href="/dictation"
                    tone="paper"
                  >
                    View all exercises
                  </MangaButton>
                </MangaPanel>
              ) : !hasStarted ? (
                <MangaPanel
                  eyebrow="Ready"
                  title="Start dictation"
                >
                  <p className="text-manga-ink-soft text-base leading-7 font-semibold">
                    Press start to play the first sentence and begin typing.
                  </p>
                  <MangaButton
                    type="button"
                    onClick={() => setHasStarted(true)}
                  >
                    Start Dictation
                  </MangaButton>
                </MangaPanel>
              ) : (
                <>
                  <GuidedAnswerInput
                    correction={charCorrection}
                    onChange={answer =>
                      setAnswerDrafts(currentDrafts => ({
                        ...currentDrafts,
                        [currentSegment.id]: answer,
                      }))
                    }
                    onCheck={checkDraft}
                    onReveal={revealSegment}
                    showAnswerImmediately={preferences.showAnswerImmediately}
                    showFullAnswer={preferences.showFullAnswer}
                    status={guidedStatus}
                    value={currentAnswer}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    {attemptResolved ? (
                      <>
                        <MangaButton
                          type="button"
                          onClick={advanceAfterAttempt}
                        >
                          {canGoNext ? 'Next' : 'Finish'}
                        </MangaButton>
                        {currentAttempt?.isPassed ? (
                          <MangaButton
                            type="button"
                            tone="paper"
                            onClick={retryCurrent}
                          >
                            Retry
                          </MangaButton>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <MangaButton
                          type="button"
                          onClick={checkDraft}
                        >
                          Check
                        </MangaButton>
                        <MangaButton
                          type="button"
                          tone="paper"
                          onClick={skipSegment}
                        >
                          Skip
                        </MangaButton>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <label className="flex items-center gap-2 text-sm font-black">
                      <input
                        type="checkbox"
                        checked={preferences.showAnswerImmediately}
                        onChange={event =>
                          setPreferences(currentPreferences => ({
                            ...currentPreferences,
                            showAnswerImmediately: event.target.checked,
                          }))
                        }
                        className="border-manga-black size-5 border-2"
                      />
                      Show answer immediately
                    </label>
                    <label className="flex items-center gap-2 text-sm font-black">
                      <input
                        type="checkbox"
                        checked={preferences.showFullAnswer}
                        onChange={event =>
                          setPreferences(currentPreferences => ({
                            ...currentPreferences,
                            showFullAnswer: event.target.checked,
                          }))
                        }
                        className="border-manga-black size-5 border-2"
                      />
                      Show full answer
                    </label>
                  </div>

                  {translationTracks.length > 0 && selectedLanguage ? (
                    <DictationTranslation
                      isUnlocked={isTranslationUnlocked}
                      language={selectedLanguage}
                      text={translationText}
                    />
                  ) : null}
                </>
              )}
            </TabsContent>

            <TabsContent
              value="transcript"
              className="min-w-0"
            >
              <DictationFullTranscript
                currentSegmentId={currentSegment.id}
                isActive={activeView === 'transcript'}
                onSelectSegment={segment => {
                  const index = segments.findIndex(
                    item => item.id === segment.id
                  )

                  if (index >= 0) goToCaption(index)
                }}
                playingSegmentId={activeCaptionSegment?.id ?? null}
                segments={segments}
                translations={transcriptTranslations}
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

        <footer className="grid gap-2">
          <p className="text-manga-ink-soft min-w-0 text-sm leading-6 font-semibold">
            {sessionError ??
              (currentSegment.startMs === null || currentSegment.endMs === null
                ? 'Untimed segment. Use the normal player controls, then type.'
                : `Sentence ${currentIndex + 1} of ${segments.length}. Replay uses this segment's timestamp window.`)}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {preferences.showShortcuts ? (
              <div className="text-manga-ink-soft flex flex-wrap gap-x-3 gap-y-1 text-xs font-black">
                <span>Ctrl · replay</span>
                <span>Enter · check</span>
                <span>Alt + arrows · move</span>
              </div>
            ) : (
              <span />
            )}
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
          </div>
        </footer>
      </section>
    </div>
  )
}
