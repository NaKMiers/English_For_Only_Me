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
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickVocabWordButton } from '@/components/vocabulary/QuickVocabLookup'
import { cn } from '@/lib/utils'
import {
  autoCorrectAnswer,
  buildCharCorrection,
  buildDictationCorrection,
  createLocalDictationAttempt,
  type CharCorrectionResult,
} from '@/modules/dictation/correction'
import type { YoutubePlayerStatus } from '@/modules/dictation/player/useYoutubeDictationPlayer'
import {
  readDictationAnswerDrafts,
  useDictationPreferences,
  writeDictationAnswerDrafts,
  type DictationPracticePreferences,
} from '@/modules/dictation/preferences/dictationPreferences'
import { useDictationShortcuts } from '@/modules/dictation/preferences/shortcuts'
import {
  resolveCaptionForWindow,
  type CaptionCue,
} from '@/modules/dictation/translations/captionOverlap'
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

interface TranslationTrack {
  cues: CaptionCue[]
  language: string
}

interface Props {
  completions: number
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

// Video size maps to how the video/tabs row splits. small/normal/large change
// the two-column ratio on lg; max drops to a single column so the video spans
// the full row and the tabs sit beneath it.
const VIDEO_GRID_CLASS_NAME: Record<string, string> = {
  small: 'lg:grid-cols-[minmax(0,0.75fr)_minmax(300px,1.25fr)]',
  normal: 'lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]',
  large: 'lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.7fr)]',
  max: 'grid-cols-1',
}

const PRACTICE_TAB_TRIGGER_CLASS_NAME =
  'border-manga-black text-manga-ink-soft bg-manga-white shadow-[2px_2px_0_var(--manga-black)] hover:bg-manga-paper-soft focus-visible:ring-manga-red/35 data-active:bg-manga-red! data-active:text-manga-white! data-active:shadow-[5px_5px_0_var(--manga-black)]! data-active:-translate-x-[2px] data-active:-translate-y-[2px] !h-auto min-h-11 flex-1 rounded-none border-3 px-3 py-2 font-sans text-sm font-black transition-all after:hidden sm:flex-none'

export function DictationPracticeShell({
  completions,
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
  const [vocabLookupError, setVocabLookupError] = useState<string | null>(null)
  const [showAnswerWords, setShowAnswerWords] = useState(false)
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
  const answerDraftsRef = useRef(answerDrafts)
  const [activeView, setActiveView] = useState<'practice' | 'transcript'>(
    'practice'
  )
  const [activePlaybackIndex, setActivePlaybackIndex] = useState<number | null>(
    null
  )
  // Segments the learner retried after an earlier pass: translation stays
  // hidden for these until they pass the segment again.
  const [retriedSegmentIds, setRetriedSegmentIds] = useState<Set<string>>(
    () => new Set()
  )
  const [correctSegmentIds, setCorrectSegmentIds] = useState<Set<string>>(
    () => new Set()
  )
  const [locallyResetSegmentIds, setLocallyResetSegmentIds] = useState<
    Set<string>
  >(() => new Set())
  const replayCountRef = useRef<Record<string, number>>({})
  const segmentStartedAtRef = useRef(0)
  const autoPlayedSegmentIdRef = useRef<string | null>(null)
  const answerTextareaRef = useRef<HTMLTextAreaElement>(null)
  const persistQueueRef = useRef<Promise<unknown>>(Promise.resolve())
  const sessionRequestRef = useRef<Promise<DictationSessionApiRecord> | null>(
    null
  )
  const isMountedRef = useRef(false)
  const [currentIndex, setCurrentIndex] = useState(() =>
    clampIndex(initialSession?.currentSegmentOrder ?? 0, segments.length)
  )
  const [playerController, setPlayerController] = useState<PlayerController>({
    canReplay: false,
    getCurrentTimeMs: () => null,
    message: 'YouTube player is loading.',
    pause: () => undefined,
    playFromMs: () => undefined,
    playSegment: () => undefined,
    replay: () => undefined,
    seekToMs: () => undefined,
    status: 'idle',
  })
  // Latest controller in a ref so effects can call it (pause/playSegment) without
  // re-firing every time the controller object changes (status flips a lot).
  const playerControllerRef = useRef(playerController)
  const handleControllerChange = useCallback((controller: PlayerController) => {
    playerControllerRef.current = controller
    setPlayerController(controller)
  }, [])
  // Full Transcript: loop the caption being viewed, and auto-scroll to follow it.
  const [isRepeatingCaption, setIsRepeatingCaption] = useState(false)
  const [autoScrollTranscript, setAutoScrollTranscript] = useState(true)
  const { preferences, setPreferences } = useDictationPreferences(
    getInitialPreferences(initialSession)
  )
  const currentSegment = segments[currentIndex] ?? null
  const hasCurrentAnswerDraft = currentSegment
    ? Object.prototype.hasOwnProperty.call(answerDrafts, currentSegment.id)
    : false
  const currentAnswerDraft =
    currentSegment && hasCurrentAnswerDraft
      ? (answerDrafts[currentSegment.id] ?? '')
      : ''
  const currentSegmentWasLocallyReset = Boolean(
    currentSegment && locallyResetSegmentIds.has(currentSegment.id)
  )
  // Translation unlocks once the learner types it correctly, or skips it -
  // skipping already reveals the answer, so gating the translation too would
  // just be a second wall. Revealing still keeps the translation gated. A
  // retried segment re-locks the translation (even if it was passed before)
  // until it's passed again.
  const passedAttempt = Boolean(currentAttempt?.isPassed)
  const skippedAttempt = currentAttempt?.action === 'skip'
  const passedCurrentSegment =
    currentSegment !== null &&
    ((currentSegment.attemptStatus === 'correct' &&
      !currentSegmentWasLocallyReset) ||
      correctSegmentIds.has(currentSegment.id)) &&
    !retriedSegmentIds.has(currentSegment.id)
  const currentAnswer =
    currentSegment && !hasCurrentAnswerDraft && passedCurrentSegment
      ? currentSegment.text
      : currentAnswerDraft
  const currentAnswerMatchesSegment = Boolean(
    currentSegment && currentAnswer === currentSegment.text
  )
  const translationSegmentId =
    passedAttempt || skippedAttempt
      ? currentAttempt?.segmentId
      : passedCurrentSegment
        ? currentSegment?.id
        : null
  const isTranslationUnlocked = Boolean(
    ((passedAttempt || skippedAttempt) && currentAttempt?.segmentId) ||
    (passedCurrentSegment && currentSegment?.id)
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
  const shouldContinuePlayback =
    playerController.status === 'playing' ||
    playerController.status === 'buffering'
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

    const segmentId = currentSegment.id
    const timeoutId = window.setTimeout(() => {
      // Mark AFTER firing: navigating while the video plays pauses it (a side
      // effect of the timing change), which re-creates the controller and re-runs
      // this effect. If we marked up front, that re-run would bail on the guard
      // above and the seek/replay would never happen.
      autoPlayedSegmentIdRef.current = segmentId
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

  const updateAnswerDrafts = useCallback(
    (
      updater:
        | Record<string, string>
        | ((currentDrafts: Record<string, string>) => Record<string, string>)
    ) => {
      const nextDrafts =
        typeof updater === 'function'
          ? updater(answerDraftsRef.current)
          : updater

      answerDraftsRef.current = nextDrafts
      setAnswerDrafts(nextDrafts)
    },
    []
  )

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

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

  const ensurePracticeSession = useCallback(async () => {
    if (session) return session
    if (segments.length === 0) return null

    if (!sessionRequestRef.current) {
      setSessionError(null)
      sessionRequestRef.current = startOrResumeDictationSessionApi({
        videoId: video.id,
      })
        .then(response => {
          if (isMountedRef.current) {
            setSession(response.session)
            setSessionMode(response.mode ?? 'start')
            setCurrentIndex(
              clampIndex(response.session.currentSegmentOrder, segments.length)
            )
          }

          return response.session
        })
        .catch(error => {
          sessionRequestRef.current = null

          if (isMountedRef.current)
            setSessionError(
              error instanceof Error
                ? error.message
                : 'Could not start this practice session.'
            )

          throw error
        })
    }

    return sessionRequestRef.current
  }, [segments.length, session, video.id])

  useEffect(() => {
    if (session || segments.length === 0) return

    void ensurePracticeSession().catch(() => undefined)
  }, [ensurePracticeSession, segments.length, session])

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const safeIndex = clampIndex(nextIndex, segments.length)
      const segment = segments[safeIndex]

      if (!segment) return

      setCurrentIndex(safeIndex)
      setDraftNotice(null)
      setVocabLookupError(null)
      setShowAnswerWords(false)
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
        playerController.seekToMs(segment.startMs, {
          play: shouldContinuePlayback,
        })
    },
    [playerController, segments, shouldContinuePlayback]
  )

  const handleControlsGoPrevious = useCallback(() => {
    if (activeView === 'transcript') goToCaption(activeCaptionIndex - 1)
    else goPrevious()
  }, [activeCaptionIndex, activeView, goToCaption, goPrevious])

  const handleControlsGoNext = useCallback(() => {
    if (activeView === 'transcript') goToCaption(activeCaptionIndex + 1)
    else goNext()
  }, [activeCaptionIndex, activeView, goNext, goToCaption])

  const toggleRepeatCaption = useCallback(
    () => setIsRepeatingCaption(previous => !previous),
    []
  )

  // Loop the caption the learner is viewing while Repeat is on, and follow it if
  // they select another. The controller is read from a ref so this only re-fires
  // when the caption or the toggle changes - not on every player status flip.
  const activeCaptionStartMs = activeCaptionSegment?.startMs ?? null
  const activeCaptionEndMs = activeCaptionSegment?.endMs ?? null
  useEffect(() => {
    if (activeView !== 'transcript' || !isRepeatingCaption) return
    if (activeCaptionStartMs === null || activeCaptionEndMs === null) return

    playerControllerRef.current.playSegment(
      activeCaptionStartMs,
      activeCaptionEndMs,
      { loop: true }
    )

    return () => playerControllerRef.current.pause()
  }, [activeCaptionEndMs, activeCaptionStartMs, activeView, isRepeatingCaption])

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

      void (async () => {
        const activeSession = await ensurePracticeSession().catch(error => {
          setSessionError(
            error instanceof Error
              ? error.message
              : 'Could not start this practice session.'
          )

          return null
        })

        if (!activeSession) return

        const idempotencyKey = createIdempotencyKey()
        const replayCountDelta = replayCountRef.current[currentSegment.id] ?? 0
        const timeSpentMs = Math.max(
          0,
          Date.now() - segmentStartedAtRef.current
        )
        const typedAnswer =
          answerDraftsRef.current[currentSegment.id] ??
          answerTextareaRef.current?.value ??
          currentAnswer
        // Check also auto-corrects: rewrite the words the learner got right to the
        // canonical case/punctuation/spacing, while genuinely wrong words are kept
        // for them to fix. The char display then renders THIS corrected draft.
        const displayAnswer =
          action === 'check'
            ? autoCorrectAnswer(currentSegment.text, typedAnswer)
            : typedAnswer
        // Word-level result feeds analytics/persistence and scores the ORIGINAL
        // typing; the char-level result drives the guided display of the corrected
        // draft. Same expected text, two representations (F1).
        const correction = buildDictationCorrection({
          action,
          expectedText: currentSegment.text,
          typedAnswer,
        })
        const charResult = buildCharCorrection({
          action,
          expectedText: currentSegment.text,
          typedAnswer: displayAnswer,
        })
        const localAttempt = createLocalDictationAttempt({
          correction,
          expectedText: currentSegment.text,
          idempotencyKey,
          userId: activeSession.userId,
          replayCountDelta,
          segmentId: currentSegment.id,
          sessionId: activeSession.id,
          timeSpentMs,
          transcriptId: currentSegment.transcriptId,
          typedAnswer,
          videoId: currentSegment.videoId,
        })

        // Score on the client for instant feedback; the server recomputes the
        // identical correction when it persists the attempt in the background.
        setDraftNotice(null)
        setSessionError(null)
        setVocabLookupError(null)
        setShowAnswerWords(false)

        // Resolved (correct / reveal / skip): fill the full canonical answer into
        // the textarea like DailyDictation, and keep it so revisiting the segment
        // shows the answer again. A wrong Check swaps in the auto-corrected draft:
        // matched words become canonical, the boundary word is underlined in place,
        // and the caret drops just after it so nothing typed past it is lost.
        if (correction.isPassed || action === 'reveal' || action === 'skip')
          updateAnswerDrafts(currentDrafts => ({
            ...currentDrafts,
            [currentSegment.id]: currentSegment.text,
          }))
        else if (action === 'check')
          updateAnswerDrafts(currentDrafts => ({
            ...currentDrafts,
            [currentSegment.id]: displayAnswer,
          }))

        replayCountRef.current[currentSegment.id] = 0
        segmentStartedAtRef.current = Date.now()

        // A fresh pass re-unlocks the translation for a previously retried segment.
        if (correction.isPassed) {
          setCorrectSegmentIds(currentIds => {
            if (currentIds.has(currentSegment.id)) return currentIds

            const nextIds = new Set(currentIds)

            nextIds.add(currentSegment.id)

            return nextIds
          })
          setLocallyResetSegmentIds(currentIds => {
            if (!currentIds.has(currentSegment.id)) return currentIds

            const nextIds = new Set(currentIds)

            nextIds.delete(currentSegment.id)

            return nextIds
          })
          setRetriedSegmentIds(currentIds => {
            if (!currentIds.has(currentSegment.id)) return currentIds

            const nextIds = new Set(currentIds)

            nextIds.delete(currentSegment.id)

            return nextIds
          })
        }

        // Feedback is shown in place; the learner advances with Next / Enter.
        setCurrentAttempt(localAttempt)
        setCharCorrection(charResult)

        const segmentId = currentSegment.id

        // Serialize persistence so the server's segment-cursor guard sees attempts
        // in the same order the learner made them.
        persistQueueRef.current = persistQueueRef.current
          .catch(() => undefined)
          .then(() =>
            submitDictationAttemptApi(activeSession.id, {
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
      })()
    },
    [currentAnswer, currentSegment, ensurePracticeSession, updateAnswerDrafts]
  )

  // A resolved attempt (passed, revealed, or skipped) shows the answer and waits
  // for the learner to advance with Next / Enter.
  const persistedCorrectDraft = Boolean(
    !currentAttempt && passedCurrentSegment && currentAnswerMatchesSegment
  )
  const attemptResolved = currentAttempt
    ? currentAttempt.isPassed ||
      currentAttempt.action === 'reveal' ||
      currentAttempt.action === 'skip'
    : persistedCorrectDraft
  const isRevealedAttempt = Boolean(
    currentAttempt &&
    (currentAttempt.action === 'reveal' || currentAttempt.action === 'skip')
  )
  const guidedStatus: GuidedStatus = isRevealedAttempt
    ? 'revealed'
    : currentAnswerMatchesSegment
      ? 'correct'
      : currentAttempt
        ? currentAttempt.isPassed
          ? 'correct'
          : currentAttempt.action === 'reveal' ||
              currentAttempt.action === 'skip'
            ? 'revealed'
            : 'incorrect'
        : 'idle'
  // Retry stays available for any segment the learner has checked at least once -
  // whether from this attempt or a persisted one from an earlier visit.
  const hasCheckedCurrent =
    Boolean(currentAttempt) ||
    (!currentSegmentWasLocallyReset && (currentSegment?.attemptCount ?? 0) > 0)

  const advanceAfterAttempt = useCallback(() => {
    // Keep the resolved answer in the draft so revisiting the segment shows it.
    if (canGoNext) goToIndex(currentIndex + 1)
    else {
      setVocabLookupError(null)
      setShowAnswerWords(false)
      setCurrentAttempt(null)
      setCharCorrection(null)
      setIsCompleted(true)
    }
  }, [canGoNext, currentIndex, goToIndex])

  const retryCurrent = useCallback(() => {
    if (currentSegment) {
      updateAnswerDrafts(currentDrafts => ({
        ...currentDrafts,
        [currentSegment.id]: '',
      }))
      setRetriedSegmentIds(currentIds => {
        const nextIds = new Set(currentIds)

        nextIds.add(currentSegment.id)

        return nextIds
      })
      setCorrectSegmentIds(currentIds => {
        if (!currentIds.has(currentSegment.id)) return currentIds

        const nextIds = new Set(currentIds)

        nextIds.delete(currentSegment.id)

        return nextIds
      })
    }

    setCurrentAttempt(null)
    setCharCorrection(null)
    setVocabLookupError(null)
    setShowAnswerWords(false)
    replayCurrentSegment()
  }, [currentSegment, replayCurrentSegment, updateAnswerDrafts])

  // Rewind: just navigate back to the first segment, keep drafts and stats.
  const goToFirstSegment = useCallback(() => {
    setIsCompleted(false)
    setVocabLookupError(null)
    setShowAnswerWords(false)
    setCurrentAttempt(null)
    setCharCorrection(null)
    goToIndex(0)
  }, [goToIndex])

  // Restart: clear this session's local progress and replay from segment one.
  // Saved attempts, completions, badges, and server cursor stay untouched.
  const restartProgress = useCallback(() => {
    const firstSegment = segments[0]

    updateAnswerDrafts({})
    setCurrentIndex(0)
    setActivePlaybackIndex(0)
    setActiveView('practice')
    setDraftNotice(null)
    setVocabLookupError(null)
    setShowAnswerWords(false)
    setCurrentAttempt(null)
    setCharCorrection(null)
    setIsCompleted(false)
    setHasStarted(true)
    setCorrectSegmentIds(new Set())
    setLocallyResetSegmentIds(new Set(segments.map(segment => segment.id)))
    setRetriedSegmentIds(new Set())
    autoPlayedSegmentIdRef.current = null

    if (firstSegment?.startMs !== null && firstSegment?.endMs !== null)
      playerControllerRef.current.playSegment(
        firstSegment.startMs,
        firstSegment.endMs
      )
  }, [segments, updateAnswerDrafts])

  // Check / Enter: grade the draft, or advance once the answer is resolved.
  const checkDraft = useCallback(() => {
    if (attemptResolved) advanceAfterAttempt()
    else runAttempt('check')
  }, [advanceAfterAttempt, attemptResolved, runAttempt])

  // Skip button: reveal the answer (recorded as a skip) and wait for Next.
  const skipSegment = useCallback(() => {
    if (attemptResolved) advanceAfterAttempt()
    else runAttempt('skip')
  }, [advanceAfterAttempt, attemptResolved, runAttempt])

  const handleEscapeShortcut = useCallback(() => {
    if (hasCheckedCurrent) retryCurrent()
    else skipSegment()
  }, [hasCheckedCurrent, retryCurrent, skipSegment])

  // Ctrl+[ / Ctrl+] use the tab-aware handlers so they move the dictation cursor
  // on the practice tab and scrub captions on the Full Transcript tab.
  const shortcutHandlers = useMemo(
    () => ({
      check: checkDraft,
      escape: handleEscapeShortcut,
      next: handleControlsGoNext,
      previous: handleControlsGoPrevious,
      replay: replayCurrentSegment,
    }),
    [
      checkDraft,
      handleEscapeShortcut,
      handleControlsGoNext,
      handleControlsGoPrevious,
      replayCurrentSegment,
    ]
  )

  useDictationShortcuts({
    enabled: preferences.showShortcuts,
    handlers: shortcutHandlers,
  })

  const hasCompletedBefore = completions > 0
  const hasSavedPracticeProgress =
    segments.some(segment => segment.attemptCount > 0) ||
    Object.values(answerDrafts).some(draft => draft.trim().length > 0) ||
    (session?.currentSegmentOrder ?? 0) > 0
  const readyActionLabel = hasCompletedBefore
    ? 'Restart Dictation'
    : hasSavedPracticeProgress
      ? 'Continue Dictation'
      : 'Start Dictation'
  const readyActionTitle = hasCompletedBefore
    ? 'Restart dictation'
    : hasSavedPracticeProgress
      ? 'Continue dictation'
      : 'Start dictation'

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
    <div className="mx-auto grid w-full min-w-0 gap-4">
      <section className="border-manga-black bg-manga-white grid min-w-0 gap-3 border-3 p-3 shadow-[5px_5px_0_var(--manga-black)] sm:p-4">
        <DictationPracticeHeader
          completions={completions}
          eyebrow={sessionMode === 'resume' ? 'Resume dictation' : 'Dictation'}
          level={video.level}
          title={video.title}
          translationLanguages={translationTracks.map(track => track.language)}
          translationLanguage={selectedLanguage}
          onTranslationLanguageChange={setSelectedLanguage}
        />

        <DictationControls
          answerTextSize={preferences.answerTextSize}
          canGoNext={canGoToNextCaption}
          canGoPrevious={canGoToPreviousCaption}
          canReplay={playerController.canReplay}
          currentIndex={displayIndex}
          isVideoHidden={preferences.isVideoHidden}
          onAnswerTextSizeChange={answerTextSize =>
            setPreferences(currentPreferences => ({
              ...currentPreferences,
              answerTextSize,
            }))
          }
          onGoNext={handleControlsGoNext}
          onGoPrevious={handleControlsGoPrevious}
          onGoToFirstSegment={goToFirstSegment}
          onReplay={replayCurrentSegment}
          onRestart={restartProgress}
          onSpeedChange={changeSpeed}
          onToggleVideo={toggleVideo}
          playbackSpeed={preferences.playbackSpeed}
          totalSegments={segments.length}
        />

        <div
          className={cn(
            'grid min-w-0 items-start gap-3',
            VIDEO_GRID_CLASS_NAME[preferences.videoSize]
          )}
        >
          <DictationYoutubePlayer
            className="self-start lg:sticky lg:top-4"
            hidden={preferences.isVideoHidden}
            onControllerChange={handleControllerChange}
            onHiddenChange={hidden => {
              setPreferences(currentPreferences => ({
                ...currentPreferences,
                isVideoHidden: hidden,
              }))
              patchSession({ isVideoHidden: hidden })
            }}
            onVideoSizeChange={videoSize =>
              setPreferences(currentPreferences => ({
                ...currentPreferences,
                videoSize,
              }))
            }
            playbackSpeed={preferences.playbackSpeed}
            timing={{
              endMs: currentSegment.endMs,
              startMs: currentSegment.startMs,
            }}
            title={video.title}
            videoSize={preferences.videoSize}
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
                    <MangaButton href={`/dictation/videos/${video.id}/results`}>
                      View Results
                    </MangaButton>
                    <MangaButton
                      href="/dictation"
                      tone="paper"
                      icon={undefined}
                    >
                      Next Exercise
                    </MangaButton>
                    <MangaButton
                      type="button"
                      tone="paper"
                      onClick={restartProgress}
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
                  title={readyActionTitle}
                  className={
                    hasCompletedBefore
                      ? 'bg-manga-paper-soft'
                      : hasSavedPracticeProgress
                        ? 'bg-cyan-50'
                        : undefined
                  }
                >
                  <p className="text-manga-ink-soft text-base leading-7 font-semibold">
                    {hasCompletedBefore
                      ? 'Start over from the first sentence. Your completion record stays saved.'
                      : hasSavedPracticeProgress
                        ? 'Pick up from your saved sentence and keep going.'
                        : 'Press start to play the first sentence and begin typing.'}
                  </p>
                  <MangaButton
                    type="button"
                    tone={hasCompletedBefore ? 'paper' : undefined}
                    onClick={
                      hasCompletedBefore
                        ? restartProgress
                        : () => setHasStarted(true)
                    }
                  >
                    {readyActionLabel}
                  </MangaButton>
                </MangaPanel>
              ) : (
                <>
                  <GuidedAnswerInput
                    answerTextSize={preferences.answerTextSize}
                    correction={charCorrection}
                    expectedText={currentSegment.text}
                    inputRef={answerTextareaRef}
                    onChange={answer => {
                      if (
                        currentAttempt?.isPassed &&
                        answer !== currentSegment.text
                      ) {
                        setCurrentAttempt(null)
                        setCharCorrection(null)
                      }

                      updateAnswerDrafts(currentDrafts => ({
                        ...currentDrafts,
                        [currentSegment.id]: answer,
                      }))
                    }}
                    onCheck={checkDraft}
                    onReveal={handleEscapeShortcut}
                    renderCorrectionWord={({ children, className, term }) => (
                      <QuickVocabWordButton
                        attemptId={currentAttempt?.id ?? null}
                        className={className}
                        contextSentence={currentSegment.text}
                        onError={setVocabLookupError}
                        segmentId={currentSegment.id}
                        term={term}
                        videoId={video.id}
                      >
                        {children}
                      </QuickVocabWordButton>
                    )}
                    revealAnswerWords={showAnswerWords}
                    showAnswerImmediately={preferences.showAnswerImmediately}
                    showFullAnswer={preferences.showFullAnswer}
                    status={guidedStatus}
                    statusAction={
                      <>
                        {attemptResolved ? (
                          <>
                            {guidedStatus === 'correct' && !showAnswerWords ? (
                              <MangaButton
                                type="button"
                                tone="paper"
                                className="text-base"
                                onClick={() => setShowAnswerWords(true)}
                              >
                                Show answer words
                              </MangaButton>
                            ) : null}
                            <MangaButton
                              type="button"
                              className="text-base"
                              onClick={advanceAfterAttempt}
                            >
                              {canGoNext ? 'Next' : 'Finish'}
                            </MangaButton>
                          </>
                        ) : (
                          <>
                            <MangaButton
                              type="button"
                              className="text-base"
                              onClick={checkDraft}
                            >
                              Check
                            </MangaButton>
                            <MangaButton
                              type="button"
                              tone="paper"
                              className="text-base"
                              onClick={skipSegment}
                            >
                              Skip
                            </MangaButton>
                          </>
                        )}
                        {hasCheckedCurrent ? (
                          <MangaButton
                            type="button"
                            tone="paper"
                            className="text-base"
                            onClick={retryCurrent}
                          >
                            Retry
                          </MangaButton>
                        ) : null}
                      </>
                    }
                    value={currentAnswer}
                  />

                  {vocabLookupError ? (
                    <div
                      role="status"
                      className="border-manga-black bg-manga-pale-red text-manga-red border-2 p-3 text-sm font-black shadow-[2px_2px_0_var(--manga-black)]"
                    >
                      {vocabLookupError}
                    </div>
                  ) : null}

                  {translationTracks.length > 0 && selectedLanguage ? (
                    <DictationTranslation
                      isUnlocked={isTranslationUnlocked}
                      language={selectedLanguage}
                      text={translationText}
                      textSize={preferences.answerTextSize}
                    />
                  ) : null}

                  <div className="flex flex-col gap-2">
                    <Label className="flex items-center gap-2 text-base font-black">
                      <Switch
                        size="lg"
                        checked={preferences.showAnswerImmediately}
                        onCheckedChange={checked =>
                          setPreferences(currentPreferences => ({
                            ...currentPreferences,
                            showAnswerImmediately: checked,
                          }))
                        }
                      />
                      Show answer immediately
                    </Label>
                    <Label className="flex items-center gap-2 text-base font-black">
                      <Switch
                        size="lg"
                        checked={preferences.showFullAnswer}
                        onCheckedChange={checked =>
                          setPreferences(currentPreferences => ({
                            ...currentPreferences,
                            showFullAnswer: checked,
                          }))
                        }
                      />
                      Show full answer
                    </Label>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent
              value="transcript"
              className="min-w-0"
            >
              <DictationFullTranscript
                autoScroll={autoScrollTranscript}
                canRepeat={
                  activeCaptionSegment?.startMs != null &&
                  activeCaptionSegment?.endMs != null
                }
                currentSegmentId={currentSegment.id}
                isActive={activeView === 'transcript'}
                isRepeating={isRepeatingCaption}
                onSelectSegment={segment => {
                  const index = segments.findIndex(
                    item => item.id === segment.id
                  )

                  if (index >= 0) goToCaption(index)
                }}
                onToggleAutoScroll={() =>
                  setAutoScrollTranscript(previous => !previous)
                }
                onToggleRepeat={toggleRepeatCaption}
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
                <span>Command / Alt · replay</span>
                <span>Enter · check</span>
                <span>Ctrl + [ ] · move</span>
              </div>
            ) : (
              <span />
            )}
            <Label className="flex items-center gap-2 text-sm font-black">
              <Switch
                size="default"
                checked={preferences.showShortcuts}
                onCheckedChange={checked => {
                  const showShortcuts = checked

                  setPreferences(currentPreferences => ({
                    ...currentPreferences,
                    showShortcuts,
                  }))
                  patchSession({ showShortcuts })
                }}
              />
              Show shortcut hints
            </Label>
          </div>
        </footer>
      </section>
    </div>
  )
}
