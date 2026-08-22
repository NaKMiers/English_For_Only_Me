'use client'

import { useCallback, useEffect, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { CreatureMotion } from '@/components/grammar/cast/CreatureMotion'
import { CreatureSigil } from '@/components/grammar/cast/CreatureSigil'
import { SenseiPortrait } from '@/components/grammar/cast/SenseiPortrait'
import { ImpactStamp } from '@/components/grammar/comic/ImpactStamp'
import { SpeechBubble } from '@/components/grammar/comic/SpeechBubble'
import { MangaButton } from '@/components/ui/MangaButton'
import { useGrammarSfx } from '@/lib/audio/useGrammarSfx'
import { useReducedMotion } from '@/lib/motion/useReducedMotion'
import { creatureFromPoint } from '@/modules/grammar/presentation/creatureFromPoint'
import { resolveCreatureState } from '@/modules/grammar/presentation/resolveCreatureState'
import { resolveDrillBeat } from '@/modules/grammar/presentation/resolveDrillBeat'
import { SENSEI_LINES } from '@/modules/grammar/presentation/senseiLines'
import type {
  GrammarRecallAnswerResult,
  GrammarRecallTaskRecord,
} from '@/modules/grammar/types'

import { L1RiskTag } from './GrammarRiskBadges'

/** Kinds where the learner produces free text, so a rejected answer may be valid. */
const PRODUCTION_KINDS = new Set(['transform', 'correct', 'build'])

const TOKEN_CLASS: Record<string, string> = {
  correct: 'bg-manga-white text-manga-black',
  extra: 'bg-manga-black text-manga-white line-through',
  missing: 'bg-manga-pale-red text-manga-black border-dashed',
  spellingVariant: 'bg-yellow-100 text-yellow-950',
  wrong: 'bg-manga-red text-manga-white',
}

function CorrectionDiff({
  correction,
}: {
  correction: NonNullable<GrammarRecallAnswerResult['correction']>
}) {
  return (
    <div className="grid gap-2">
      <p className="font-sans text-xs font-black uppercase">
        Closest correct answer
      </p>
      <div className="flex flex-wrap gap-1">
        {correction.tokens.map((token, index) => (
          <span
            className={`border-manga-black border-2 px-2 py-0.5 font-mono text-sm font-semibold ${
              TOKEN_CLASS[token.status] ?? TOKEN_CLASS.correct
            }`}
            key={`${token.status}-${index}`}
            title={token.status}
          >
            {token.expected ?? token.actual ?? '_'}
          </span>
        ))}
      </div>
      <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
        {correction.expected}
      </p>
    </div>
  )
}

/**
 * The daily recall loop.
 *
 * The client never learns the correct answer before submitting: the served task
 * carries only the prompt, the kind, and the choices. Grading happens on the
 * server, which is what keeps the ladder honest.
 *
 * `idempotencyKey` arrives with the task and is echoed back on submit, so a
 * double-click or a retried request replays the original result instead of
 * advancing two ladder rungs.
 */
export function GrammarRecallModal({
  onClose,
  tasks: initialTasks,
}: {
  onClose: () => void
  tasks: GrammarRecallTaskRecord[]
}) {
  const [tasks] = useState(initialTasks)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<GrammarRecallAnswerResult | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const [accepted, setAccepted] = useState(false)

  const task = tasks[index] ?? null

  /**
   * The escape hatch that makes accept-lists survivable.
   *
   * A static list of accepted answers WILL eventually reject a correct wording,
   * and a grader that rejects correct English stops being trusted - which kills
   * the whole production-drill layer. One click appends the learner's wording to
   * that drill's accepted answers, so it passes from then on.
   *
   * The write lands in Mongo; `grammar:export` carries it back into the
   * committed JSON so it survives the next content regeneration.
   */
  const acceptMyAnswer = useCallback(async () => {
    if (!task || !answer.trim()) return

    setPending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/grammar/accept-answer', {
        body: JSON.stringify({
          answer,
          drillId: task.drillId,
          slug: task.pointSlug,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null)

        setMessage(
          (body as { message?: string } | null)?.message ??
            'Could not accept that answer.'
        )
        return
      }

      setAccepted(true)
    } finally {
      setPending(false)
    }
  }, [answer, task])

  const { enabled: soundOn, play, toggle: toggleSound } = useGrammarSfx()
  const { reduced: motionOff, toggle: toggleMotion } = useReducedMotion()

  /**
   * Submit one answer.
   *
   * `value` is a PARAMETER, not read from `answer` state, and that is the whole
   * point. It used to read the state, and the choice buttons called
   * `setAnswer(choice)` immediately followed by `submit(false)` in the same
   * handler - so `submit` ran with the `answer` from the render that created it,
   * which is `''` on a fresh drill. Every multiple-choice drill in the recall
   * loop posted an empty string, was graded wrong, and then displayed the target
   * as "Expected" - showing the learner the exact sentence they had just clicked,
   * labelled wrong.
   *
   * Passing the value in removes the dependency on when React flushes state, so
   * the answer that was clicked is the answer that is graded. It also drops
   * `answer` from the dependency list, so there is one less stale closure to
   * reason about.
   */
  const submit = useCallback(
    async ({ revealed, value }: { revealed: boolean; value: string }) => {
      if (!task || pending || result) return

      setPending(true)
      setMessage(null)

      try {
        const response = await fetch('/api/grammar/recall/answer', {
          body: JSON.stringify({
            answer: value,
            drillId: task.drillId,
            idempotencyKey: task.idempotencyKey,
            revealed,
            slug: task.pointSlug,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null)

          setMessage(
            (body as { message?: string } | null)?.message ??
              'Could not submit that answer.'
          )
          return
        }

        const graded = (await response.json()) as GrammarRecallAnswerResult

        setResult(graded)
        if (graded.isCorrect) setCorrect(previous => previous + 1)

        // Driven off the same beat the visuals use, so the four outcomes cannot
        // disagree with each other. `play` is a no-op while sound is off, and
        // the context was created by the toggle click - never here, after an
        // await, where autoplay policy would block it.
        const sting = resolveDrillBeat({
          stageAfter: graded.item.recallStage,
          stageBefore: task.recallStage,
          verdict: graded.verdict,
        })

        if (sting.isRegression) play('revive')
        else if (graded.verdict === 'correct') play('correct')
        else if (graded.verdict === 'wrong') play('wrong')
      } finally {
        setPending(false)
      }
    },
    [pending, play, result, task]
  )

  const next = useCallback(() => {
    setResult(null)
    setAnswer('')
    setMessage(null)
    setAccepted(false)
    setIndex(previous => previous + 1)
    play('pageTurn')
  }, [play])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)

    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!task)
    return (
      <MangaPanel
        eyebrow="Grammar recall"
        title="Session done"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          {correct} of {tasks.length} correct. Points you missed are due again
          immediately; the rest move up the ladder.
        </p>
        <MangaButton onClick={onClose}>Close</MangaButton>
      </MangaPanel>
    )

  // The beat is derived from the graded result, so it exists only after a
  // submission. Before that there is nothing to react to.
  const beat = result
    ? resolveDrillBeat({
        stageAfter: result.item.recallStage,
        stageBefore: task.recallStage,
        verdict: result.verdict,
      })
    : null

  return (
    <MangaPanel
      action={
        <div className="flex flex-wrap gap-2">
          <SettingToggle
            label="Sound"
            on={soundOn}
            onToggle={toggleSound}
          />
          {/* Both settings get a real button rather than living only behind an
              OS preference: the keyboard path to every control is part of the
              accessibility contract, and a learner may want motion off here
              without changing it system-wide. */}
          <SettingToggle
            label="Motion"
            on={!motionOff}
            onToggle={toggleMotion}
          />
        </div>
      }
      eyebrow={`Recall ${index + 1} of ${tasks.length}`}
      title={task.pointTitle}
    >
      <div className="flex items-start gap-3">
        <CreatureMotion outcome={beat?.creatureOutcome ?? null}>
          <CreatureSigil
            className="max-w-32"
            size="plate"
            spec={creatureFromPoint({
              point: { ...task, title: task.pointTitle },
              recallStage: task.recallStage,
            })}
            state={resolveCreatureState({
              reviewStatus: task.reviewStatus,
              status: 'learning',
            })}
          />
        </CreatureMotion>

        <div className="grid min-w-0 flex-1 gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <L1RiskTag l1Risk={task.l1Risk} />
            <span className="border-manga-black border-2 px-2 py-0.5 font-sans text-xs font-black uppercase">
              {task.cefrLevel} - stage {task.recallStage}/7
            </span>
          </div>
          {task.reviewStatus === 'unverified' ? (
            <p
              className="text-manga-ink-soft text-xs leading-5 font-semibold"
              role="status"
            >
              {SENSEI_LINES.unverified}
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-base leading-7 font-semibold">{task.prompt}</p>

      {message ? (
        <p className="border-manga-black bg-manga-red text-manga-white border-3 p-3 text-sm font-black uppercase">
          {message}
        </p>
      ) : null}

      {task.choices?.length ? (
        <div className="grid gap-2">
          {task.choices.map(choice => (
            <MangaButton
              disabled={pending || Boolean(result)}
              key={choice}
              onClick={() => {
                // `setAnswer` is for the selected-tone highlight and the
                // accept-my-answer flow. The graded value is passed straight
                // through, because state is not readable yet in this tick.
                setAnswer(choice)
                void submit({ revealed: false, value: choice })
              }}
              tone={answer === choice ? 'ink' : 'paper'}
              type="button"
            >
              {choice}
            </MangaButton>
          ))}
        </div>
      ) : (
        <textarea
          className="border-manga-black bg-manga-white text-manga-black min-h-24 border-3 p-3 font-mono text-sm font-semibold"
          disabled={pending || Boolean(result)}
          onChange={event => setAnswer(event.target.value)}
          placeholder="Type your answer"
          value={answer}
        />
      )}

      {result && beat ? (
        <div className="grid gap-3">
          <div className="flex items-start gap-3">
            <SenseiPortrait
              expression={beat.expression}
              size="sm"
            />
            <div className="grid min-w-0 flex-1 gap-2">
              {beat.stamp ? (
                <div className="flex">
                  <ImpactStamp tone={beat.stampTone}>{beat.stamp}</ImpactStamp>
                </div>
              ) : null}
              <SpeechBubble speaker="Sensei">{beat.line}</SpeechBubble>
              <p className="text-manga-ink-soft font-sans text-xs font-black uppercase">
                {result.isCorrect
                  ? `Now at stage ${result.item.recallStage}/7`
                  : `Back to stage ${result.item.recallStage}/7`}
              </p>
            </div>
          </div>
          {/* The token diff stays exactly as it was. The comic treatment sits
              around the pedagogically load-bearing part; it does not replace
              it. */}
          {result.correction ? (
            <CorrectionDiff correction={result.correction} />
          ) : result.matchedAnswer ? (
            <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
              Expected: {result.matchedAnswer}
            </p>
          ) : null}
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
            {result.explanation}
          </p>

          {!result.isCorrect &&
          PRODUCTION_KINDS.has(task.kind) &&
          answer.trim() ? (
            accepted ? (
              <div className="grid gap-2">
                <SpeechBubble
                  speaker="Sensei"
                  tail="none"
                >
                  {SENSEI_LINES.graderOverridden}
                </SpeechBubble>
                <p className="border-manga-black bg-manga-white border-2 p-2 text-xs font-black uppercase">
                  Added to the accepted answers for this drill. Run
                  grammar:export to keep it.
                </p>
              </div>
            ) : (
              <MangaButton
                disabled={pending}
                onClick={() => void acceptMyAnswer()}
                type="button"
              >
                {pending ? 'Accepting...' : 'My Answer Was Also Correct'}
              </MangaButton>
            )
          ) : null}

          <MangaButton onClick={next}>
            {index + 1 < tasks.length ? 'Next Drill' : 'Finish'}
          </MangaButton>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {task.choices?.length ? null : (
            <MangaButton
              disabled={pending || !answer.trim()}
              onClick={() => void submit({ revealed: false, value: answer })}
              tone="ink"
              type="button"
            >
              {pending ? 'Checking...' : 'Check'}
            </MangaButton>
          )}
          <MangaButton
            disabled={pending}
            onClick={() => void submit({ revealed: true, value: answer })}
            type="button"
          >
            Reveal
          </MangaButton>
          <MangaButton onClick={onClose}>Close</MangaButton>
        </div>
      )}
    </MangaPanel>
  )
}

function SettingToggle({
  label,
  on,
  onToggle,
}: {
  label: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      aria-pressed={on}
      className="border-manga-black bg-manga-white text-manga-black min-h-11 border-3 px-3 font-sans text-xs font-black uppercase"
      onClick={onToggle}
      type="button"
    >
      {label} {on ? 'on' : 'off'}
    </button>
  )
}
