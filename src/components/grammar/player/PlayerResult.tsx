'use client'

import {
  Check,
  Clock3,
  CloudOff,
  Flame,
  Loader2,
  Lock,
  PartyPopper,
  Star,
  Target,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

import { InlineNotice } from '@/components/common/InlineNotice'
import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { SessionEnd } from '@/components/journey/SessionEnd'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type { GrammarSessionMode } from '@/modules/grammar/constants'
import {
  isPracticeCard,
  type PracticeCard,
} from '@/modules/grammar/course/types'
import { gradeCard } from '@/modules/grammar/grading/gradeCard'
import type { PlayerJourney } from '@/modules/grammar/path/playerJourney'
import { advanceUnitSummary } from '@/modules/grammar/path/unitSummary'
import type { GrammarSessionResult } from '@/modules/grammar/session/planGrammarSessionWrite'
import type { PlayCard } from '@/modules/grammar/session/preparePlayCards'
import { starsForAccuracy } from '@/modules/grammar/session/scoring'
import { PASS_ACCURACY } from '@/modules/grammar/constants'
import {
  buildGrammarSessionWrite,
  type GrammarSessionRequestBody,
} from '@/requests/grammarSessionsApi'

import { nextHref, nextLabel } from '../path/pathNext'
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

/** The one next stop after a session: where it goes and what it is. */
interface NextStep {
  actionLabel: string
  detail: string
  href: string
  title: string
}

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
  /** The path around this session (server data); null on old callers. */
  journey?: PlayerJourney | null
  onComplete: () => void
  /** Play again (Redo / Retry): a fresh server render, no full reload. */
  onRestart: () => void
  /** True while the fresh render for Redo / Retry is on its way. */
  restarting?: boolean
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
  const t = useMessages()

  return (
    // Spans: it sits inside the session end's headline paragraph.
    <span
      aria-label={format(t.grammar.stars, { stars })}
      className="inline-flex gap-2"
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
    </span>
  )
}

function headline(
  t: Messages['grammar']['result']['headlines'],
  mode: GrammarSessionMode,
  passed: boolean,
  testOut: boolean
) {
  switch (mode) {
    case 'lesson':
      return t.lesson
    case 'review':
      return passed ? t.reviewPassed : t.reviewFailed
    case 'checkpoint':
      if (testOut) return passed ? t.testOutPassed : t.testOutFailed

      return passed ? t.checkpointPassed : t.checkpointFailed
    case 'weak':
      return t.weak
  }
}

export function PlayerResult({
  canSave,
  durationMs,
  exitHref,
  journey = null,
  mode,
  onComplete,
  onRestart,
  plays,
  restarting = false,
  state,
  targetId,
  title,
}: Props) {
  const messages = useMessages()
  const t = messages.grammar.result
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
  // One real next step: what this session unlocked, else where the path
  // already pointed (a replay or a review unlocks nothing), never "Back to
  // path" while the path has somewhere to go.
  const pathNext =
    journey &&
    !(
      (journey.next.kind === 'lesson' || journey.next.kind === 'review') &&
      journey.next.lessonId === targetId
    ) &&
    !(journey.next.kind === 'checkpoint' && journey.next.unitId === targetId)
      ? journey.next
      : null
  let next: NextStep | null = null

  if (unlocked?.kind === 'lesson')
    next = {
      actionLabel: t.nextLesson,
      detail: t.detailUnlocked,
      href: `/grammar/lessons/${unlocked.lessonId}`,
      title: unlocked.title,
    }
  else if (unlocked?.kind === 'checkpoint')
    next = {
      actionLabel: t.takeCheckpoint,
      detail: t.detailUnlocked,
      href: `/grammar/units/${unlocked.unitId}/checkpoint`,
      title: unlocked.title,
    }
  else if (unlocked?.kind === 'unit' && journey?.nextUnitFirstLessonId)
    next = {
      actionLabel: t.startUnit,
      detail: t.detailUnlocked,
      href: `/grammar/lessons/${journey.nextUnitFirstLessonId}`,
      title: unlocked.title,
    }
  else if (pathNext) {
    const href = nextHref(pathNext)

    if (href)
      next = {
        actionLabel: messages.grammar.path.go,
        detail: t.detailUpNext,
        href,
        title: nextLabel(messages.grammar.path.next, pathNext),
      }
  }

  // Every lesson of the course is done: the all-clear instead of a stop.
  const allClear = !next && journey?.next.kind === 'done'

  // The journey line: the unit after this session (a replay adds nothing).
  const unitAfter =
    journey?.unit && mode === 'lesson'
      ? advanceUnitSummary(journey.unit, targetId, passed)
      : null
  // One line: the step this session took and how far the checkpoint is.
  const unitName = unitAfter
    ? format(messages.grammar.unitLevel, {
        level: unitAfter.level,
        order: unitAfter.order,
      })
    : ''
  const journeyStep = unitAfter
    ? unitAfter.left > 0
      ? format(
          plural(
            unitAfter.gained > 0 ? t.journeyGained : t.journeyHeld,
            unitAfter.left
          ),
          { unit: unitName }
        )
      : format(unitAfter.gained > 0 ? t.journeyGainedOpen : t.journeyHeldOpen, {
          unit: unitName,
        })
    : null
  const canRetry =
    (mode === 'lesson' && stars !== null && stars < 3) ||
    (mode !== 'lesson' && !passed)

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-8">
      <SessionEnd
        focusTitle
        fixUp={
          misses.length > 0
            ? {
                items: misses.map(card => {
                  const answer = state.firstAnswers[card.id]
                  const expected = gradeCard(
                    card,
                    answer ?? { kind: 'fill', value: '' }
                  ).expected

                  return (
                    <div
                      className="border-line bg-surface rounded-control grid gap-1.5 border p-3"
                      key={card.id}
                    >
                      {answer ? (
                        <p className="text-danger flex items-start gap-2 text-sm font-medium">
                          <X
                            aria-hidden
                            className="mt-0.5 size-4 shrink-0"
                          />
                          <span className="sr-only">{t.yourAnswer}</span>
                          {describeAnswer(
                            card,
                            answer,
                            messages.grammar.card.wrongWord
                          )}
                        </p>
                      ) : null}
                      <p className="flex items-start gap-2 font-medium">
                        <Check
                          aria-hidden
                          className="text-lesson-correct mt-1 size-4 shrink-0"
                        />
                        <span className="sr-only">{t.correctAnswer}</span>
                        <span className="min-w-0 flex-1">{expected}</span>
                        <SpeakButton text={expected} />
                      </p>
                      <p className="text-ink-soft text-sm">{card.explain}</p>
                    </div>
                  )
                }),
                moreLabel: plural(
                  messages.common.journey.moreItems,
                  misses.length - 1
                ),
                title:
                  result && !result.testOut
                    ? `${plural(t.reviewMisses, misses.length)} · ${t.addedToWeak}`
                    : plural(t.reviewMisses, misses.length),
              }
            : null
        }
        headline={
          stars !== null
            ? { value: <StarRow stars={stars} /> }
            : {
                icon: passed ? <Check /> : <X />,
                value: `${Math.round(summary.accuracy * 100)}%`,
              }
        }
        journeyStep={journeyStep}
        module="grammar"
        nextStop={
          <NextStopCard
            actionLabel={next?.actionLabel ?? t.backToPath}
            className="border-line border"
            detail={next?.detail}
            done={
              allClear
                ? {
                    icon: <PartyPopper aria-hidden />,
                    text: messages.common.journey.allClear,
                  }
                : undefined
            }
            href={next?.href ?? exitHref}
            pinLabel={messages.common.journey.nextStop}
            title={next?.title ?? t.backToPath}
            variant="compact"
          />
        }
        notice={
          <SaveNotice
            save={save}
            onRetry={send}
          />
        }
        secondary={
          <>
            {canRetry ? (
              <ActionButton
                disabled={restarting}
                onClick={onRestart}
                tone="paper"
              >
                {mode === 'lesson'
                  ? messages.grammar.redoForStars
                  : messages.common.actions.retry}
              </ActionButton>
            ) : null}
            {next || allClear ? (
              <Link
                className="soft-press hover-pop text-ink-soft hover:text-ink rounded-control inline-flex min-h-11 items-center px-3 text-sm font-medium"
                href={exitHref}
              >
                {t.backToPath}
              </Link>
            ) : null}
          </>
        }
        stats={
          <StatStrip label={title}>
            {stars !== null ? (
              <StatChip
                icon={Target}
                label={t.accuracy}
                tone="grammar"
                value={`${Math.round(summary.accuracy * 100)}%`}
              />
            ) : null}
            <StatChip
              icon={Flame}
              label={t.bestStreak}
              tone="grammar"
              value={`x${state.bestCombo}`}
            />
            <StatChip
              icon={Clock3}
              label={t.time}
              tone="grammar"
              value={formatDuration(durationMs)}
            />
          </StatStrip>
        }
        title={headline(t.headlines, mode, passed, testOut)}
        titleId="player-result-title"
        wins={
          <span className="grid gap-1">
            <span className="font-medium">{title}</span>
            {mode === 'checkpoint' && !passed ? (
              <span className="flex items-center gap-2 text-sm font-medium">
                <Lock
                  aria-hidden
                  className="size-4"
                />
                {format(t.passMark, {
                  percent: Math.round(PASS_ACCURACY * 100),
                })}
              </span>
            ) : null}
          </span>
        }
      />
    </div>
  )
}

function SaveNotice({
  onRetry,
  save,
}: {
  onRetry: () => void
  save: SaveState
}) {
  const messages = useMessages()
  const t = messages.grammar.result

  return (
    <div aria-live="polite">
      {save.kind === 'saving' ? (
        <p className="text-ink-soft flex items-center gap-2 text-sm">
          <Loader2
            aria-hidden
            className="size-4 motion-safe:animate-spin"
          />
          {t.saving}
        </p>
      ) : null}
      {save.kind === 'queued' ? (
        <InlineNotice>
          <span className="flex items-center gap-2">
            <CloudOff
              aria-hidden
              className="size-4 shrink-0"
            />
            {t.queued}
          </span>
        </InlineNotice>
      ) : null}
      {save.kind === 'retryable' ? (
        <InlineNotice
          action={
            <ActionButton
              onClick={onRetry}
              tone="paper"
            >
              {messages.common.actions.retry}
            </ActionButton>
          }
          tone="error"
        >
          {format(t.notSaved, { message: save.message })}
        </InlineNotice>
      ) : null}
      {save.kind === 'rejected' ? (
        <InlineNotice tone="error">{save.message}</InlineNotice>
      ) : null}
      {save.kind === 'offline' ? (
        <p className="text-ink-soft text-sm">{t.offline}</p>
      ) : null}
    </div>
  )
}
