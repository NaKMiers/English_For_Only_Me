'use client'

import { useCallback, useEffect, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import {
  GRAMMAR_FAMILY_LABELS,
  GRAMMAR_L1_RISKS,
} from '@/modules/grammar/constants'
import type { L1RiskQueueEntry } from '@/modules/grammar/taxonomy/buildL1RiskQueue'
import type { GrammarFamily, GrammarL1Risk } from '@/modules/grammar/types'

import { L1RiskTag } from './GrammarRiskBadges'

const KEY_TO_RISK: Record<string, GrammarL1Risk> = {
  '1': 'low',
  '2': 'medium',
  '3': 'high',
}

/**
 * One point per screen, keyboard-driven, 184 times.
 *
 * The examples are on screen and not optional. Judging how hard `zero-article`
 * is for a Vietnamese speaker from its slug and title is guesswork, and
 * guesswork is exactly what this pass exists to replace - a tool that makes it
 * easy to answer without reading would produce 184 rows of the same assistant
 * judgment the field already holds.
 */
export function AdminL1RiskPanel({ entries }: { entries: L1RiskQueueEntry[] }) {
  const [index, setIndex] = useState(0)
  const [judged, setJudged] = useState<Record<string, GrammarL1Risk | null>>(
    () =>
      Object.fromEntries(
        entries
          .filter(entry => entry.l1RiskObserved != null)
          .map(entry => [entry.slug, entry.l1RiskObserved])
      )
  )
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const current = entries[index]

  const move = useCallback(
    (delta: number) => {
      setIndex(previous =>
        Math.min(entries.length - 1, Math.max(0, previous + delta))
      )
    },
    [entries.length]
  )

  const judge = useCallback(
    async (slug: string, l1RiskObserved: GrammarL1Risk | null) => {
      setMessage(null)
      setSaving(true)

      try {
        const response = await fetch('/api/admin/grammar/l1-risk', {
          body: JSON.stringify({ l1RiskObserved, slug }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        if (!response.ok) {
          const body: unknown = await response.json().catch(() => null)

          // Never advance on a failure. Silently moving on is how a judgment
          // gets lost: the row looks answered and the file never changed.
          setMessage(
            (body as { message?: string } | null)?.message ??
              'Could not save that judgment.'
          )
          return
        }

        setJudged(previous => ({ ...previous, [slug]: l1RiskObserved }))
        move(1)
      } catch {
        setMessage('Could not reach the server. Nothing was written.')
      } finally {
        setSaving(false)
      }
    },
    [move]
  )

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const slug = entries[index]?.slug

      if (!slug) return

      const risk = KEY_TO_RISK[event.key]

      if (risk) {
        event.preventDefault()
        void judge(slug, risk)
        return
      }

      if (event.key === '0' || event.key === 'Backspace') {
        event.preventDefault()
        void judge(slug, null)
        return
      }

      if (event.key === 'ArrowRight' || event.key === 'j') move(1)
      if (event.key === 'ArrowLeft' || event.key === 'k') move(-1)
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [entries, index, judge, move])

  const judgedCount = Object.values(judged).filter(
    value => value != null
  ).length

  if (!current)
    return (
      <MangaPanel
        eyebrow="l1Risk"
        title="Nothing to judge"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          The taxonomy file is empty.
        </p>
      </MangaPanel>
    )

  const observed = judged[current.slug] ?? null

  return (
    <div className="grid gap-4">
      {message ? (
        <p
          className="border-manga-black bg-manga-red text-manga-white border-3 p-3 text-sm font-black uppercase"
          role="alert"
        >
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-manga-ink-soft font-sans text-xs font-black uppercase">
          {judgedCount} of {entries.length} judged - point {index + 1}, hardest
          first
        </p>
        <p className="text-manga-ink-soft font-sans text-xs font-black uppercase">
          1 low - 2 medium - 3 high - 0 clear - arrows to move
        </p>
      </div>

      <MangaPanel
        eyebrow={GRAMMAR_FAMILY_LABELS[current.family as GrammarFamily]}
        title={current.title}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="border-manga-black border-2 px-2 py-0.5 font-sans text-xs font-black uppercase">
            {current.cefrLevel} - difficulty {current.complexity}/5
          </span>
          <span className="border-manga-black border-2 border-dashed px-2 py-0.5 font-sans text-xs font-black uppercase">
            authored {current.l1Risk}
          </span>
          {observed ? <L1RiskTag l1Risk={observed} /> : null}
          {!current.hasLesson ? (
            <span className="border-manga-black border-2 px-2 py-0.5 font-sans text-xs font-black uppercase">
              No lesson yet
            </span>
          ) : null}
        </div>

        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          {current.summary}
        </p>

        {current.examples.length > 0 ? (
          <ul className="grid gap-2">
            {current.examples.slice(0, 4).map(example => (
              <li
                className="border-manga-black bg-manga-white border-2 p-2"
                key={example.en}
              >
                <p className="text-manga-black text-sm leading-6 font-black">
                  {example.en}
                </p>
                {example.vi ? (
                  <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
                    {example.vi}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold italic">
            No examples generated yet - judge from the summary, or open the
            lesson.
          </p>
        )}

        {current.l1Notes ? (
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold whitespace-pre-line">
            {current.l1Notes}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {GRAMMAR_L1_RISKS.map(risk => (
            <MangaButton
              disabled={saving}
              key={risk}
              onClick={() => {
                void judge(current.slug, risk)
              }}
              tone={observed === risk ? 'ink' : undefined}
              type="button"
            >
              {risk}
            </MangaButton>
          ))}
          <MangaButton
            disabled={saving || observed == null}
            onClick={() => {
              void judge(current.slug, null)
            }}
            type="button"
          >
            Clear
          </MangaButton>
          <MangaButton href={`/grammar/points/${current.slug}`}>
            Open Lesson
          </MangaButton>
        </div>
      </MangaPanel>

      <div className="flex flex-wrap gap-2">
        <MangaButton
          disabled={index === 0}
          onClick={() => move(-1)}
          type="button"
        >
          Previous
        </MangaButton>
        <MangaButton
          disabled={index >= entries.length - 1}
          onClick={() => move(1)}
          type="button"
        >
          Skip
        </MangaButton>
      </div>

      <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
        Judgments are written straight into{' '}
        <code>src/modules/grammar/seed/data/taxonomy.json</code>. Read the git
        diff, commit it, then run <code>bun run grammar:seed</code> - nothing on
        the site moves until you do.
      </p>
    </div>
  )
}
