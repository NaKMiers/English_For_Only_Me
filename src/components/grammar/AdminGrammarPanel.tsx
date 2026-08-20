'use client'

import { useState, useTransition } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import { GRAMMAR_FAMILY_LABELS } from '@/modules/grammar/constants'
import type { GrammarPointApiRecord } from '@/modules/grammar/types'

import { L1RiskTag } from './GrammarRiskBadges'

/**
 * Review queue. Ordered by Vietnamese risk descending upstream, so the highest
 * value content gets verified first: those are the points this learner will
 * actually study hardest, and the ones where a wrong AI explanation does the
 * most damage.
 */
export function AdminGrammarPanel({
  points,
}: {
  points: GrammarPointApiRecord[]
}) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())

  async function markReviewed(slug: string) {
    setMessage(null)

    const response = await fetch('/api/admin/grammar/review', {
      body: JSON.stringify({ reviewStatus: 'reviewed', slug }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null)

      setMessage(
        (body as { message?: string } | null)?.message ??
          'Could not mark that point reviewed.'
      )
      return
    }

    setDone(previous => new Set(previous).add(slug))
  }

  if (points.length === 0)
    return (
      <MangaPanel
        eyebrow="Admin"
        title="Nothing to review"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          Every written lesson has been reviewed. Generate more with{' '}
          <code>bun run grammar:generate</code>.
        </p>
      </MangaPanel>
    )

  return (
    <div className="grid gap-4">
      {message ? (
        <p className="border-manga-black bg-manga-red text-manga-white border-3 p-3 text-sm font-black uppercase">
          {message}
        </p>
      ) : null}

      <p className="text-manga-ink-soft font-sans text-xs font-black uppercase">
        {points.length} unverified lesson{points.length === 1 ? '' : 's'},
        highest Vietnamese risk first
      </p>

      {points.map(point => (
        <MangaPanel
          eyebrow={GRAMMAR_FAMILY_LABELS[point.family]}
          key={point.slug}
          title={point.title}
        >
          <div className="flex flex-wrap items-center gap-2">
            <L1RiskTag l1Risk={point.l1Risk} />
            <span className="border-manga-black border-2 px-2 py-0.5 font-sans text-xs font-black uppercase">
              {point.cefrLevel} - difficulty {point.complexity}/5
            </span>
          </div>

          {point.explanation ? (
            <p className="text-manga-ink-soft text-sm leading-6 font-semibold whitespace-pre-line">
              {point.explanation}
            </p>
          ) : (
            <p className="text-manga-ink-soft text-sm leading-6 font-semibold italic">
              No lesson body generated yet.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <MangaButton href={`/grammar/points/${point.slug}`}>
              Open Lesson
            </MangaButton>
            {done.has(point.slug) ? (
              <span className="border-manga-black bg-manga-white inline-flex min-h-11 items-center border-3 px-4 font-sans text-sm font-black uppercase">
                Marked reviewed
              </span>
            ) : (
              <MangaButton
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void markReviewed(point.slug)
                  })
                }
                tone="ink"
                type="button"
              >
                Mark Reviewed
              </MangaButton>
            )}
          </div>
        </MangaPanel>
      ))}
    </div>
  )
}
