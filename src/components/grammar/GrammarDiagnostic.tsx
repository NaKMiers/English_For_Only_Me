'use client'

import { useCallback, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import type { DiagnosticItem } from '@/modules/grammar/diagnostic/selectDiagnosticItems'
import type { DiagnosticResult } from '@/modules/grammar/diagnostic/diagnosticService'

import { L1RiskTag } from './GrammarRiskBadges'

function newSessionKey() {
  return `diag-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function Summary({
  onClose,
  result,
}: {
  onClose: () => void
  result: DiagnosticResult
}) {
  return (
    <MangaPanel
      eyebrow="Placement result"
      title={`${result.correct} of ${result.total} correct`}
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
              Weak on {result.weakestRisks.join(', ')}-interference points - the
              ones Vietnamese fights hardest.
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

      <MangaButton onClick={onClose}>Done</MangaButton>
    </MangaPanel>
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
