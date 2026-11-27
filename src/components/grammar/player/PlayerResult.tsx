'use client'

import { Check, CloudOff, Loader2, Lock, Star, Unlock, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { ActionButton } from '@/components/ui/ActionButton'
import { cn } from '@/lib/utils'
import type { GrammarSessionMode } from '@/modules/grammar/constants'
import {
  isPracticeCard,
  type PracticeCard,
} from '@/modules/grammar/course/types'
import { gradeCard } from '@/modules/grammar/grading/gradeCard'
import type { GrammarSessionResult } from '@/modules/grammar/session/planGrammarSessionWrite'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'
import { starsForAccuracy } from '@/modules/grammar/session/scoring'
import { PASS_ACCURACY } from '@/modules/grammar/constants'
import {
  buildGrammarSessionWrite,
  type GrammarSessionRequestBody,
} from '@/requests/grammarSessionsApi'

import { SpeakButton } from '../SpeakButton'

import { describeAnswer } from './cardDraft'
import {
  collectAnswers,
  summarizePlayer,
  type PlayerState,
} from './playerReducer'

// Past this the save is most likely waiting for the network: say so, while
// the outbox keeps delivering in the background.
const SLOW_SAVE_MS = 6000

type SaveState =
  | { kind: 'saving' }
  | { kind: 'queued' }
  | { kind: 'saved'; result: GrammarSessionResult }
  | { kind: 'retryable'; message: string }
  | { kind: 'rejected'; message: string }
  | { kind: 'offline' }

interface Props {
  mode: GrammarSessionMode
  targetId: string
  title: string
  plays: PlayCard[]
  state: PlayerState
  durationMs: number
  exitHref: string
  canSave: boolean
  onComplete: () => void
}

function createKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000))

  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function StarRow({ stars }: { stars: number }) {
  return (
    <div
      aria-label={`${stars} of 3 stars`}
      className="flex justify-center gap-2"
      role="img"
    >
      {[1, 2, 3].map(index => (
        <Star
          aria-hidden
          className={cn(
            'size-12 stroke-[2.5] sm:size-14',
            index <= stars
              ? 'fill-brand text-ink motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:fill-mode-both'
              : 'text-ink-soft fill-transparent'
          )}
          key={index}
          style={{ animationDelay: `${index * 160}ms` }}
        />
      ))}
    </div>
  )
}

function headline(mode: GrammarSessionMode, passed: boolean, testOut: boolean) {
  switch (mode) {
    case 'lesson':
      return 'Lesson done!'
    case 'review':
      return passed ? 'Review done, still sharp!' : 'Needs a little more review'
    case 'checkpoint':
      if (testOut) return passed ? 'Tested out!' : 'Not this time'

      return passed ? 'Checkpoint passed!' : 'Checkpoint not passed yet'
    case 'weak':
      return 'Practice done!'
  }
}

export function PlayerResult({
  canSave,
  durationMs,
  exitHref,
  mode,
  onComplete,
  plays,
  state,
  targetId,
  title,
}: Props) {
  const summary = summarizePlayer(state)
  const localPassed =
    mode === 'lesson' || mode === 'weak' || summary.accuracy >= PASS_ACCURACY
  const [save, setSave] = useState<SaveState>(
    canSave ? { kind: 'saving' } : { kind: 'offline' }
  )
  const outbox = useClientOutbox()
  const bodyRef = useRef<GrammarSessionRequestBody | null>(null)
  const startedRef = useRef(false)

  /**
   * Hand the session to the shared outbox. It stores the write before
   * sending, retries network and server failures with the same idempotency
   * key, and replays it on the next load if this tab closes first. The
   * promise settles only once the server answered (or the outbox gave up).
   */
  function send() {
    const body = bodyRef.current

    if (!body) return

    setSave({ kind: 'saving' })

    const slowTimer = window.setTimeout(() => {
      setSave(current =>
        current.kind === 'saving' ? { kind: 'queued' } : current
      )
    }, SLOW_SAVE_MS)

    void outbox.enqueue(buildGrammarSessionWrite(body)).then(result => {
      window.clearTimeout(slowTimer)

      if (result.ok) {
        setSave({ kind: 'saved', result: result.data as GrammarSessionResult })
        return
      }

      // 0 = this outbox stopped before delivering (the write stays stored);
      // 408 / 429 / 5xx = the outbox ran out of retries. Both may succeed
      // later. Any other 4xx is final: the same body will never be accepted.
      const retryable =
        result.status === 0 ||
        result.status === 408 ||
        result.status === 429 ||
        result.status >= 500

      setSave({
        kind: retryable ? 'retryable' : 'rejected',
        message: result.error,
      })
    })
  }

  // Runs once per finished session.
  useEffect(() => {
    if (startedRef.current) return

    startedRef.current = true
    onComplete()

    if (!canSave) return

    const body: GrammarSessionRequestBody = {
      answers: collectAnswers(plays, state),
      idempotencyKey: createKey(),
      mode,
      targetId,
    }

    bodyRef.current = body
    send()
    // The session is final once this screen mounts: run exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const result = save.kind === 'saved' ? save.result : null
  const passed = result?.passed ?? localPassed
  const stars =
    mode === 'lesson'
      ? (result?.stars ?? starsForAccuracy(summary.accuracy))
      : null
  const testOut = result?.testOut ?? false
  const misses = plays
    .map(play => play.card)
    .filter((card): card is PracticeCard => isPracticeCard(card))
    .filter(
      (card, index, list) =>
        list.findIndex(item => item.id === card.id) === index
    )
    .filter(card => state.firstCorrect[card.id] === false)

  const unlocked = result?.unlocked ?? null
  let nextHref = exitHref
  let nextLabel = 'Back to path'

  if (unlocked?.kind === 'lesson') {
    nextHref = `/grammar/lessons/${unlocked.lessonId}`
    nextLabel = 'Next lesson'
  } else if (unlocked?.kind === 'checkpoint') {
    nextHref = `/grammar/units/${unlocked.unitId}/checkpoint`
    nextLabel = 'Take the checkpoint'
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-8">
      {/* page-hero: bare in day mode, a lit card under the lamp. */}
      <div className="page-hero grid gap-5">
        <div className="grid gap-3 text-center">
          {stars !== null ? <StarRow stars={stars} /> : null}
          {stars === null ? (
            <div
              className={cn(
                'border-line mx-auto grid size-16 place-items-center rounded-full border',
                passed
                  ? 'bg-lesson-correct text-surface'
                  : 'bg-danger text-surface'
              )}
            >
              {passed ? (
                <Check
                  aria-hidden
                  className="size-8"
                />
              ) : (
                <X
                  aria-hidden
                  className="size-8"
                />
              )}
            </div>
          ) : null}
          <h1 className="font-sans text-3xl leading-tight font-medium">
            {headline(mode, passed, testOut)}
          </h1>
          <p className="text-ink-soft font-bold">{title}</p>
        </div>

        <dl className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'Accuracy',
              value: `${Math.round(summary.accuracy * 100)}%`,
            },
            { label: 'Best streak', value: `x${state.bestCombo}` },
            { label: 'Time', value: formatDuration(durationMs) },
          ].map(item => (
            <div
              className="border-line bg-surface rounded-control grid gap-1 border p-3 text-center"
              key={item.label}
            >
              <dt className="text-ink-soft text-xs font-normal">
                {item.label}
              </dt>
              <dd className="font-sans text-2xl font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div aria-live="polite">
          {save.kind === 'saving' ? (
            <p className="text-ink-soft flex items-center justify-center gap-2 text-sm font-bold">
              <Loader2
                aria-hidden
                className="size-4 motion-safe:animate-spin"
              />
              Saving...
            </p>
          ) : null}
          {save.kind === 'queued' ? (
            <p className="text-ink-soft flex items-center justify-center gap-2 text-center text-sm font-bold">
              <CloudOff
                aria-hidden
                className="size-4 shrink-0"
              />
              Waiting for the network. Your result is kept on this device and
              will send itself once you are back online.
            </p>
          ) : null}
          {save.kind === 'retryable' ? (
            <div className="border-danger rounded-control grid gap-2 border border-dashed p-3 text-sm">
              <p className="flex items-center gap-2 font-bold">
                <CloudOff
                  aria-hidden
                  className="size-4"
                />
                Not saved yet ({save.message}).
              </p>
              <ActionButton
                className="w-fit"
                onClick={send}
                tone="paper"
              >
                Try again
              </ActionButton>
            </div>
          ) : null}
          {save.kind === 'rejected' ? (
            <p className="border-danger rounded-control border border-dashed p-3 text-sm font-bold">
              {save.message}
            </p>
          ) : null}
          {save.kind === 'offline' ? (
            <p className="text-ink-soft text-center text-sm">
              No database is set up, so this result was not saved.
            </p>
          ) : null}
          {unlocked ? (
            <p className="border-line bg-tint rounded-control motion-safe:animate-in motion-safe:slide-in-from-bottom-2 flex items-center gap-2 border p-3 font-bold">
              <Unlock
                aria-hidden
                className="size-5 shrink-0"
              />
              Unlocked: {unlocked.title}
            </p>
          ) : null}
          {mode === 'checkpoint' && !passed ? (
            <p className="flex items-center gap-2 text-sm font-bold">
              <Lock
                aria-hidden
                className="size-4"
              />
              You need at least {Math.round(PASS_ACCURACY * 100)}% to pass.
            </p>
          ) : null}
        </div>

        {misses.length > 0 ? (
          <section className="grid gap-3">
            <h2 className="font-sans text-lg font-semibold">
              Review {misses.length} wrong{' '}
              {misses.length === 1 ? 'answer' : 'answers'}
              {/* Only once the server confirmed the save; a test-out never
                  records misses. */}
              {result && !result.testOut ? (
                <span className="text-ink-soft block text-sm font-bold">
                  Added to Weak spots.
                </span>
              ) : null}
            </h2>
            <ul className="grid gap-3">
              {misses.map(card => {
                const answer = state.firstAnswers[card.id]
                const expected = gradeCard(
                  card,
                  answer ?? { kind: 'fill', value: '' }
                ).expected

                return (
                  <li
                    className="border-line bg-surface rounded-control grid gap-1.5 border p-3"
                    key={card.id}
                  >
                    {answer ? (
                      <p className="text-danger flex items-start gap-2 text-sm font-bold">
                        <X
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0"
                        />
                        <span className="sr-only">Your answer:</span>
                        {describeAnswer(card, answer)}
                      </p>
                    ) : null}
                    <p className="flex items-start gap-2 font-bold">
                      <Check
                        aria-hidden
                        className="text-lesson-correct mt-1 size-4 shrink-0"
                      />
                      <span className="sr-only">Correct answer:</span>
                      <span className="min-w-0 flex-1">{expected}</span>
                      <SpeakButton text={expected} />
                    </p>
                    <p className="text-ink-soft text-sm">{card.explain}</p>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <ActionButton
            href={nextHref}
            tone="ink"
          >
            {nextLabel}
          </ActionButton>
          {mode === 'lesson' && stars !== null && stars < 3 ? (
            <ActionButton
              onClick={() => window.location.reload()}
              tone="paper"
            >
              Redo for 3 stars
            </ActionButton>
          ) : null}
          {mode !== 'lesson' && !passed ? (
            <ActionButton
              onClick={() => window.location.reload()}
              tone="paper"
            >
              Try again
            </ActionButton>
          ) : null}
          {nextHref !== exitHref ? (
            <ActionButton
              href={exitHref}
              tone="paper"
            >
              Back to path
            </ActionButton>
          ) : null}
        </div>
      </div>
    </div>
  )
}
