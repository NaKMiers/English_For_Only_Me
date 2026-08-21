import Link from 'next/link'

import { CreatureSlot } from '@/components/grammar/cast/CreatureSlot'
import { ComicPanel } from '@/components/grammar/comic/ComicPanel'
import {
  GRAMMAR_FAMILIES,
  GRAMMAR_FAMILY_LABELS,
} from '@/modules/grammar/constants'
import { creatureFromPoint } from '@/modules/grammar/presentation/creatureFromPoint'
import { resolveCreatureState } from '@/modules/grammar/presentation/resolveCreatureState'
import { effectiveL1Risk } from '@/modules/grammar/taxonomy/effectiveL1Risk'
import type {
  GrammarFamily,
  GrammarPointApiRecord,
  GrammarPointListResult,
} from '@/modules/grammar/types'

/**
 * One entry in the bestiary.
 *
 * The creature comes first and the words second, which is the reversal that
 * makes this a bestiary rather than a table of contents. Everything the drawing
 * says is also written down beside it - menace, interference, ghost state - so
 * nothing here depends on being able to see it.
 */
function BestiaryEntry({ point }: { point: GrammarPointApiRecord }) {
  const spec = creatureFromPoint({ point, recallStage: null })
  const state = resolveCreatureState({
    reviewStatus: point.reviewStatus,
    // The browse list is not per-learner: it shows the CONTENT's state, not
    // progress. A per-point item read here would be 40 extra queries a page.
    status: null,
  })
  const risk = effectiveL1Risk(point)

  return (
    <Link
      className="border-comic-ink bg-comic-paper text-manga-black grid min-w-0 gap-3 border-3 p-3 shadow-[4px_4px_0_var(--manga-offset)] transition-transform hover:-translate-y-0.5"
      href={`/grammar/points/${point.slug}`}
    >
      <div className="flex items-start gap-3">
        <CreatureSlot
          className="max-w-24 shrink-0"
          spec={spec}
          state={state}
        />
        <div className="grid min-w-0 gap-1">
          <span className="text-manga-ink-soft font-sans text-[0.65rem] leading-none font-black tracking-[0.1em] uppercase">
            {GRAMMAR_FAMILY_LABELS[point.family]} - {spec.species}
          </span>
          <h3 className="font-sans text-lg leading-tight font-black wrap-break-word uppercase">
            {point.title}
          </h3>
          <span className="font-sans text-xs font-black uppercase">
            {'★'.repeat(spec.menace)}
            <span className="opacity-30">{'★'.repeat(5 - spec.menace)}</span>
            <span className="sr-only">
              menace {spec.menace} of 5, {risk} interference
            </span>
          </span>
        </div>
      </div>

      <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
        {point.summary}
      </p>

      <div className="flex flex-wrap items-center gap-1.5 font-sans text-[0.65rem] font-black uppercase">
        <span className="border-comic-ink border-2 px-1.5 py-0.5">
          {point.cefrLevel}
        </span>
        <span
          className={
            risk === 'high'
              ? 'border-comic-ink bg-comic-danger text-manga-white border-2 px-1.5 py-0.5'
              : 'border-comic-ink border-2 px-1.5 py-0.5'
          }
        >
          VI {risk}
        </span>
        <span className="border-comic-ink border-2 px-1.5 py-0.5">
          IELTS {point.ieltsImpact}
        </span>
        {point.drillCount > 0 ? (
          <span className="border-comic-ink border-2 px-1.5 py-0.5">
            {point.drillCount} drills
          </span>
        ) : null}
        {point.explanation ? null : (
          <span className="border-comic-ink border-2 border-dashed px-1.5 py-0.5">
            No lesson yet
          </span>
        )}
      </div>
    </Link>
  )
}

/**
 * The bestiary index.
 *
 * Grouped by species, because that is the grouping a bestiary has and because
 * the families are the one axis a learner can hold in their head - seventeen
 * groups is navigable, 184 rules is not. The sort order inside is unchanged:
 * highest interference first.
 */
export function GrammarPointList({
  result,
}: {
  result: GrammarPointListResult
}) {
  if (result.points.length === 0)
    return (
      <ComicPanel caption="Bestiary">
        <p className="text-base leading-7 font-semibold">
          Nothing matches those filters. Clear one and try again.
        </p>
      </ComicPanel>
    )

  const byFamily = new Map<GrammarFamily, GrammarPointApiRecord[]>()

  for (const point of result.points) {
    const bucket = byFamily.get(point.family) ?? []

    bucket.push(point)
    byFamily.set(point.family, bucket)
  }

  // Iterate the canonical family order so the page does not reorder its own
  // sections as filters change.
  const families = GRAMMAR_FAMILIES.filter(family => byFamily.has(family))

  return (
    <div className="grid gap-5">
      <p className="text-manga-ink-soft font-sans text-xs font-black uppercase">
        {result.total} {result.total === 1 ? 'creature' : 'creatures'} - page{' '}
        {result.page} of {result.pageCount} - highest Vietnamese interference
        first
      </p>

      {families.map(family => (
        <section
          className="grid gap-3"
          key={family}
        >
          <h2 className="border-comic-ink border-b-3 pb-1 font-sans text-sm font-black uppercase">
            {GRAMMAR_FAMILY_LABELS[family]}
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(byFamily.get(family) ?? []).map(point => (
              <BestiaryEntry
                key={point.slug}
                point={point}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
