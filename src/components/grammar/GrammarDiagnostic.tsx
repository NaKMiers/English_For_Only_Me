'use client'

import { useCallback, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { Sensei } from '@/components/grammar/cast/Sensei'
import { ComicPanel } from '@/components/grammar/comic/ComicPanel'
import { ImpactStamp } from '@/components/grammar/comic/ImpactStamp'
import { SpeechBubble } from '@/components/grammar/comic/SpeechBubble'
import { MangaButton } from '@/components/ui/MangaButton'
import type { DiagnosticResult } from '@/modules/grammar/diagnostic/diagnosticService'
import type { DiagnosticItem } from '@/modules/grammar/diagnostic/selectDiagnosticItems'

import { L1RiskTag } from './GrammarRiskBadges'

function newSessionKey() {
  return `diag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * The result screen.
 *
 * The one moment in the module worth screenshotting, so it gets the full comic
 * treatment while the questions themselves stay plain - a placement test with a
 * character commenting on every answer would be exhausting and would also leak
 * information about how you are doing mid-test.
 *
 * The unverified count is not a disclaimer in small print. This screen makes
 * confident claims about a learner on the strength of lessons nobody has read,
 * and the honest version of that claim states the number in the sensei's own
 * voice.
 */
function Summary({
  onClose,
  result,
}: {
  onClose: () => void
  result: DiagnosticResult
}) {
  const share = Math.round((result.correct / Math.max(1, result.total)) * 100)

  return (
    <div className="grid gap-4">
      <ComicPanel
        edge="a"
        halftone
        speedLines
        tone="ink"
      >
        <div className="flex items-start gap-3">
          <Sensei expression={share >= 70 ? 'neutral' : 'severe'} />
          <div className="grid min-w-0 gap-2">
            <div className="flex flex-wrap py-1.5">
              <ImpactStamp tone={share >= 70 ? 'ink' : 'danger'}>
                {`${result.correct} of ${result.total}`}
              </ImpactStamp>
            </div>
            <h2 className="font-sans text-3xl leading-none font-black uppercase sm:text-4xl">
              You are wrong about {result.total - result.correct} of these
            </h2>
            <SpeechBubble speaker="Sensei">
              {result.unverifiedCount > 0
                ? `I tested you on ${result.total} rules and I have not read the lessons for ${result.unverifiedCount} of them. Neither has anyone else. Take the score, doubt the explanations.`
                : `I tested you on ${result.total} rules. Every lesson behind them has been read by a human. The score is what it is.`}
            </SpeechBubble>
          </div>
        </div>
      </ComicPanel>

      <MangaPanel
        eyebrow="Placement result"
        title="Where you stand"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          {result.seededCount} point
          {result.seededCount === 1 ? '' : 's'} placed on the review ladder. A
          correct answer starts a point mid-ladder rather than marking it known,
          so it comes back in a few days to be confirmed.
        </p>

        {result.weakestLevels.length > 0 || result.weakestRisks.length > 0 ? (
          <div className="border-manga-black bg-manga-pale-red grid gap-2 border-3 p-3">
            <p className="font-sans text-xs font-black uppercase">
              Where to spend your time
            </p>
            {result.weakestLevels.length > 0 ? (
              <p className="text-sm leading-6 font-semibold">
                Below half at: {result.weakestLevels.join(', ')}
              </p>
            ) : null}
            {result.weakestRisks.length > 0 ? (
              <p className="text-sm leading-6 font-semibold">
                Weak on {result.weakestRisks.join(', ')}-interference points -
                the ones Vietnamese fights hardest.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
            No area fell below half. Nothing stands out as a weak spot yet.
          </p>
        )}

        <div className="grid gap-2">
          {result.byLevel.map(level => (
            <div
              className="border-manga-black bg-manga-white flex items-center justify-between border-2 px-3 py-1"
              key={level.cefrLevel}
            >
              <span className="font-sans text-xs font-black uppercase">
                {level.cefrLevel}
              </span>
              <span className="font-mono text-sm font-black">
                {level.correct}/{level.total}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <MangaButton onClick={onClose}>Done</MangaButton>
          <MangaButton href="/grammar/archive">Your English</MangaButton>
        </div>
      </MangaPanel>
    </div>
  )
}

/**
 * The placement diagnostic.
 *
 * Answers are collected locally and submitted as one batch under a single
 * session key, so grading and ladder seeding happen server-side in one
 * idempotent operation. Nothing is graded in the browser and nothing is written
 * until the learner finishes.
 */
export function GrammarDiagnostic({
  items,
  onClose,
}: {
  items: DiagnosticItem[]
  onClose: () => void
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [answer, setAnswer] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [result, setResult] = useState<DiagnosticResult | null>(null)

  const item = items[index] ?? null

  const finish = useCallback(
    async (collected: Record<string, string>) => {
      setPending(true)
      setMessage(null)

      try {
        const response = await fetch('/api/grammar/diagnostic', {
          body: JSON.stringify({
            answers: items.map(entry => ({
              answer: collected[`${entry.pointSlug}:${entry.drillId}`] ?? '',
              drillId: entry.drillId,
              pointSlug: entry.pointSlug,
            })),
            sessionKey: newSessionKey(),
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null)

          setMessage(
            (body as { message?: string } | null)?.message ??
              'Could not submit the diagnostic.'
          )
          return
        }

        setResult((await response.json()) as DiagnosticResult)
      } finally {
        setPending(false)
      }
    },
    [items]
  )

  const advance = useCallback(
    (value: string) => {
      if (!item) return

      const collected = {
        ...answers,
        [`${item.pointSlug}:${item.drillId}`]: value,
      }

      setAnswers(collected)
      setAnswer('')

      if (index + 1 >= items.length) {
        void finish(collected)
        return
      }

      setIndex(index + 1)
    },
    [answers, finish, index, item, items.length]
  )

  if (result)
    return (
      <Summary
        onClose={onClose}
        result={result}
      />
    )

  if (!item)
    return (
      <MangaPanel
        eyebrow="Placement"
        title="Nothing to test yet"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          The diagnostic needs points that have drills written. Run{' '}
          <code>bun run grammar:generate</code> to write more lessons.
        </p>
        <MangaButton onClick={onClose}>Close</MangaButton>
      </MangaPanel>
    )

  return (
    <MangaPanel
      eyebrow={`Placement ${index + 1} of ${items.length}`}
      title={item.pointTitle}
    >
      <div className="flex flex-wrap items-center gap-2">
        <L1RiskTag l1Risk={item.l1Risk} />
        <span className="border-manga-black border-2 px-2 py-0.5 font-sans text-xs font-black uppercase">
          {item.cefrLevel} - difficulty {item.complexity}/5
        </span>
      </div>

      <p className="text-base leading-7 font-semibold">{item.prompt}</p>

      {message ? (
        <p className="border-manga-black bg-manga-red text-manga-white border-3 p-3 text-sm font-black uppercase">
          {message}
        </p>
      ) : null}

      {item.choices?.length ? (
        <div className="grid gap-2">
          {item.choices.map(choice => (
            <MangaButton
              disabled={pending}
              key={choice}
              onClick={() => advance(choice)}
              type="button"
            >
              {choice}
            </MangaButton>
          ))}
        </div>
      ) : (
        <textarea
          className="border-manga-black bg-manga-white text-manga-black min-h-24 border-3 p-3 font-mono text-sm font-semibold"
          disabled={pending}
          onChange={event => setAnswer(event.target.value)}
          placeholder="Type your answer, or skip"
          value={answer}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {item.choices?.length ? null : (
          <MangaButton
            disabled={pending}
            onClick={() => advance(answer)}
            tone="ink"
            type="button"
          >
            {pending ? 'Scoring...' : 'Next'}
          </MangaButton>
        )}
        <MangaButton
          disabled={pending}
          onClick={() => advance('')}
          type="button"
        >
          Do not know
        </MangaButton>
        <MangaButton
          disabled={pending}
          onClick={onClose}
          type="button"
        >
          Cancel
        </MangaButton>
      </div>
    </MangaPanel>
  )
}
