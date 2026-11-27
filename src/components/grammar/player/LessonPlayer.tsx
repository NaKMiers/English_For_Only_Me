'use client'

import { Check, Flame, Volume2, VolumeX, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'

import { ActionButton } from '@/components/ui/ActionButton'
import { IconButton } from '@/components/ui/IconButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { formatNodes } from '@/i18n/formatNodes'
import { useLessonSfx } from '@/lib/audio/useLessonSfx'
import { cn } from '@/lib/utils'
import type { GrammarSessionMode } from '@/modules/grammar/constants'
import { isPracticeCard } from '@/modules/grammar/course/types'
import { gradeCard } from '@/modules/grammar/grading/gradeCard'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'

import { SpeakButton } from '../SpeakButton'

import { isDraftReady, toCardAnswer } from './cardDraft'
import { ExplainCardView, PracticeCardView } from './PlayerCard'
import {
  createPlayerReducer,
  currentPlay,
  initialPlayerState,
} from './playerReducer'
import { PlayerResult } from './PlayerResult'

const COMBO_MILESTONES = new Set([3, 5, 10, 15])

interface Props {
  mode: GrammarSessionMode
  targetId: string
  title: string
  plays: PlayCard[]
  /** Where X and "Back to path" go. */
  exitHref: string
  canSave: boolean
  /** The learner this tab belongs to; stored with any unsaved result. */
  /** Shown above the first card, e.g. what a test-out means. */
  intro?: string
}

export function LessonPlayer({
  canSave,
  exitHref,
  intro,
  mode,
  plays,
  targetId,
  title,
}: Props) {
  const router = useRouter()
  const messages = useMessages()
  const t = messages.grammar.player
  const reducer = useMemo(() => createPlayerReducer(plays), [plays])
  const [state, dispatch] = useReducer(reducer, plays, initialPlayerState)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [comboFlash, setComboFlash] = useState<number | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [finishedAt, setFinishedAt] = useState<number | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
  const {
    enabled: soundOn,
    play: playSting,
    toggle: toggleSound,
  } = useLessonSfx()
  const play = currentPlay(plays, state)
  const card = play?.card
  const answeredAny = Object.keys(state.firstAnswers).length > 0
  const progress = state.finished ? 1 : state.position / state.queue.length

  const check = useCallback(() => {
    if (!play || !isPracticeCard(play.card) || state.grade || !state.draft)
      return
    if (!isDraftReady(state.draft)) return

    // Predict the reducer's verdict here, in the event handler, so the sound
    // plays inside the user gesture and exactly once per check.
    const correct = gradeCard(
      play.card,
      toCardAnswer(play, state.draft)
    ).correct
    const isFirstTry = !(play.card.id in state.firstAnswers)
    const combo = isFirstTry && correct ? state.combo + 1 : state.combo

    if (!correct) playSting('wrong')
    else if (isFirstTry && COMBO_MILESTONES.has(combo)) {
      playSting('combo')
      setComboFlash(combo)
    } else playSting('correct')

    // The clock starts at the first answer, so a tab left open on the first
    // card does not count as lesson time.
    setStartedAt(previous => previous ?? Date.now())
    dispatch({ type: 'check' })
  }, [
    play,
    playSting,
    state.combo,
    state.draft,
    state.firstAnswers,
    state.grade,
  ])

  const advance = useCallback(() => {
    if (card && isPracticeCard(card) && !state.grade) {
      check()

      return
    }

    if (state.position + 1 >= state.queue.length) setFinishedAt(Date.now())

    dispatch({ type: 'continue' })
  }, [card, check, state.grade, state.position, state.queue.length])

  // Each card starts at its top, not where the previous card was scrolled to.
  useEffect(() => {
    if (stageRef.current) stageRef.current.scrollTop = 0
  }, [state.position])

  // The verdict appears under the card; bring it into view on short screens.
  const graded = state.grade !== null

  useEffect(() => {
    if (graded) feedbackRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [graded])

  useEffect(() => {
    if (comboFlash === null) return

    const timer = window.setTimeout(() => setComboFlash(null), 1400)

    return () => window.clearTimeout(timer)
  }, [comboFlash])

  // Leaving mid-lesson loses the lesson; the browser asks first.
  useEffect(() => {
    if (!answeredAny || state.finished) return

    const warn = (event: BeforeUnloadEvent) => event.preventDefault()

    window.addEventListener('beforeunload', warn)

    return () => window.removeEventListener('beforeunload', warn)
  }, [answeredAny, state.finished])

  // Keyboard: Enter checks or continues; 1-4 pick a choice option.
  useEffect(() => {
    if (state.finished) return

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null

      if (target?.closest('input, textarea, [role="dialog"]')) return

      // On a focused answer tile, Enter means "check", not "click the tile
      // again" (Space still toggles it); without preventDefault the native
      // click would land after the check and grade the old draft.
      if (event.key === 'Enter' && target?.closest('[data-tile]')) {
        event.preventDefault()
        advance()

        return
      }

      // Other buttons and links (exit, sound, the action button) keep their
      // own Enter.
      if (event.key === 'Enter' && !target?.closest('button, a')) {
        event.preventDefault()
        advance()

        return
      }

      if (
        play?.card.kind === 'choice' &&
        !state.grade &&
        /^[1-4]$/.test(event.key)
      ) {
        const option = play.optionOrder?.[Number(event.key) - 1]

        if (option !== undefined)
          dispatch({ draft: { kind: 'choice', option }, type: 'draft' })
      }
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [advance, play, state.finished, state.grade])

  function requestExit() {
    if (answeredAny && !state.finished) setConfirmLeave(true)
    else router.push(exitHref)
  }

  if (state.finished)
    return (
      // The shell is locked to one viewport, so the result scrolls inside it.
      <div className="h-full overflow-y-auto">
        <PlayerResult
          canSave={canSave}
          durationMs={startedAt && finishedAt ? finishedAt - startedAt : 0}
          exitHref={exitHref}
          mode={mode}
          onComplete={() => playSting('complete')}
          plays={plays}
          state={state}
          targetId={targetId}
          title={title}
        />
      </div>
    )

  const isPractice = card ? isPracticeCard(card) : false
  const ready = state.draft ? isDraftReady(state.draft) : false

  return (
    // Header and action bar stay put; only the card scrolls, so a long
    // explanation never pushes "Check" below the fold.
    <div className="lesson-stage grid h-full grid-rows-[auto_minmax(0,1fr)_auto]">
      <header className="border-line flex items-center gap-3 border-b p-3 sm:p-4">
        <IconButton
          label={t.leave}
          onClick={requestExit}
        >
          <X aria-hidden />
        </IconButton>
        <div
          aria-label={format(t.progress, {
            percent: Math.round(progress * 100),
          })}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(progress * 100)}
          className="border-line bg-surface rounded-tag h-4 min-w-0 flex-1 overflow-hidden border"
          role="progressbar"
        >
          <div
            className="bg-brand h-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span
          aria-live="polite"
          className={cn(
            'border-line rounded-tag inline-flex min-w-14 items-center justify-center gap-1 border px-2 py-1 text-sm font-semibold',
            state.combo >= 3 ? 'bg-brand text-surface' : 'bg-surface',
            comboFlash !== null &&
              'motion-safe:animate-in motion-safe:zoom-in-150'
          )}
          title={t.streak}
        >
          <Flame
            aria-hidden
            className="size-4"
          />
          {state.combo}
        </span>
        <IconButton
          label={soundOn ? t.mute : t.unmute}
          onClick={toggleSound}
        >
          {soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
        </IconButton>
      </header>

      <div
        className="min-h-0 overflow-y-auto overscroll-contain"
        ref={stageRef}
      >
        <section
          aria-label={title}
          className="mx-auto grid w-full max-w-2xl content-start gap-4 p-4 sm:p-6"
          data-slot="player-stage"
        >
          {intro && state.position === 0 ? (
            <p className="border-line bg-tint rounded-control border px-3 py-2 text-sm font-bold">
              {intro}
            </p>
          ) : null}
          {comboFlash !== null ? (
            <p className="text-brand motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 text-center font-sans text-lg font-semibold">
              {format(t.combo, { count: comboFlash })}
            </p>
          ) : null}
          {card?.kind === 'explain' ? <ExplainCardView card={card} /> : null}
          {play && card && isPracticeCard(card) && state.draft ? (
            <PracticeCardView
              card={card}
              checked={state.grade ? state.grade.correct : null}
              draft={state.draft}
              key={`${card.id}-${state.position}`}
              onDraft={draft => dispatch({ draft, type: 'draft' })}
              onSubmit={advance}
              play={play}
            />
          ) : null}
          <div aria-live="polite">
            {state.grade && card && isPracticeCard(card) ? (
              <div
                className={cn(
                  'bg-surface rounded-control grid scroll-mb-4 gap-1.5 border border-l-[10px] p-3 sm:p-4',
                  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2',
                  state.grade.correct
                    ? 'border-lesson-correct'
                    : 'border-danger'
                )}
                ref={feedbackRef}
              >
                {state.grade.correct ? null : (
                  <p className="flex items-start gap-1 font-bold">
                    <span className="min-w-0">
                      <span className="text-danger">{t.answerLabel} </span>
                      {state.grade.expected}
                    </span>
                    {card.kind !== 'choice' ||
                    card.sentence?.includes('___') ? (
                      <SpeakButton text={state.grade.expected} />
                    ) : null}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{card.explain}</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <footer
        className="border-line bg-surface/90 border-t px-3 py-2.5 backdrop-blur sm:px-4"
        data-slot="player-actions"
      >
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            {state.grade ? (
              <p
                className={cn(
                  'border-line text-surface rounded-tag inline-flex items-center gap-1.5 border px-2.5 py-1 font-sans text-sm font-semibold sm:text-base',
                  'motion-safe:animate-in motion-safe:zoom-in-90',
                  state.grade.correct ? 'bg-lesson-correct' : 'bg-danger'
                )}
              >
                {state.grade.correct ? (
                  <Check
                    aria-hidden
                    className="size-4 stroke-3"
                  />
                ) : (
                  <X
                    aria-hidden
                    className="size-4 stroke-3"
                  />
                )}
                {state.grade.correct ? t.correct : t.notQuite}
              </p>
            ) : (
              <p className="hidden text-sm opacity-70 sm:block">
                {formatNodes(isPractice ? t.pressToCheck : t.pressToContinue, {
                  key: (
                    <kbd className="border-line rounded-tag border px-1.5 font-sans text-xs font-semibold">
                      {t.enter}
                    </kbd>
                  ),
                })}
              </p>
            )}
          </div>
          <ActionButton
            className="min-w-32 shrink-0 sm:min-w-40"
            disabled={isPractice && !state.grade && !ready}
            onClick={advance}
            tone={state.grade || !isPractice ? 'ink' : 'primary'}
          >
            {isPractice && !state.grade
              ? t.check
              : messages.common.actions.continue}
          </ActionButton>
        </div>
      </footer>

      <Dialog
        onOpenChange={setConfirmLeave}
        open={confirmLeave}
      >
        <DialogContent className="border-line bg-surface border">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-semibold">
              {t.leaveTitle}
            </DialogTitle>
            <DialogDescription>{t.leaveDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-surface border-line border-t">
            <ActionButton
              onClick={() => setConfirmLeave(false)}
              tone="paper"
            >
              {t.keepGoing}
            </ActionButton>
            <ActionButton
              href={exitHref}
              tone="ink"
            >
              {t.leaveConfirm}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
