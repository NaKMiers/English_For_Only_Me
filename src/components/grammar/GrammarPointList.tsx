import Link from 'next/link'

import { MangaPanel } from '@/components/common/MangaPanel'
import { GRAMMAR_FAMILY_LABELS } from '@/modules/grammar/constants'
import type {
  GrammarPointApiRecord,
  GrammarPointListResult,
} from '@/modules/grammar/types'

import { GrammarAxes } from './GrammarRiskBadges'

function GrammarPointCard({ point }: { point: GrammarPointApiRecord }) {
  return (
    <Link
      className="border-manga-black bg-manga-white text-manga-black grid min-w-0 gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)] transition-transform hover:-translate-y-0.5"
      href={`/grammar/points/${point.slug}`}
    >
      <div className="grid gap-1">
        <span className="text-manga-ink-soft font-sans text-xs font-black uppercase">
          {GRAMMAR_FAMILY_LABELS[point.family]}
        </span>
        <h3 className="font-sans text-lg leading-tight font-black wrap-break-word uppercase">
          {point.title}
        </h3>
      </div>
      <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
        {point.summary}
      </p>
      <GrammarAxes
        cefrLevel={point.cefrLevel}
        complexity={point.complexity}
        ieltsImpact={point.ieltsImpact}
        l1Risk={point.l1Risk}
      />
      <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase">
        {point.reviewStatus === 'unverified' ? (
          <span className="border-manga-black border-2 border-dashed px-2 py-0.5">
            Unverified
          </span>
        ) : null}
        {point.explanation ? null : (
          <span className="border-manga-black border-2 border-dashed px-2 py-0.5">
            No lesson yet
          </span>
        )}
        {point.drillCount > 0 ? (
          <span className="border-manga-black border-2 px-2 py-0.5">
            {point.drillCount} drills
          </span>
        ) : null}
      </div>
    </Link>
  )
}

export function GrammarPointList({
  result,
}: {
  result: GrammarPointListResult
}) {
  if (result.points.length === 0)
    return (
      <MangaPanel
        eyebrow="Grammar"
        title="No points match"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          Nothing matches those filters. Clear one and try again.
        </p>
      </MangaPanel>
    )

  return (
    <div className="grid gap-4">
      <p className="text-manga-ink-soft font-sans text-xs font-black uppercase">
        {result.total} point{result.total === 1 ? '' : 's'} - page {result.page}{' '}
        of {result.pageCount} - sorted by Vietnamese risk, then difficulty
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {result.points.map(point => (
          <GrammarPointCard
            key={point.slug}
            point={point}
          />
        ))}
      </div>
    </div>
  )
}
