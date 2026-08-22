import Link from 'next/link'

import { FamilySigil } from '@/components/grammar/cast/sigils'
import { ComicPanel } from '@/components/grammar/comic/ComicPanel'
import {
  GRAMMAR_FAMILIES,
  GRAMMAR_FAMILY_LABELS,
} from '@/modules/grammar/constants'
import { CREATURE_SPECIES } from '@/modules/grammar/presentation/creatureFromPoint'
import {
  describeStudySummary,
  resolveStudyStatus,
  summariseStudyStatuses,
} from '@/modules/grammar/presentation/resolveStudyStatus'
import { effectiveL1Risk } from '@/modules/grammar/taxonomy/effectiveL1Risk'
import type {
  GrammarFamily,
  GrammarPointListResult,
} from '@/modules/grammar/types'

import { GrammarStudyPips } from './GrammarStudyPips'

type MapPoint = GrammarPointListResult['points'][number]

/**
 * The trunk, and one branch's elbow.
 *
 * Two pseudo-elements: `before` is the vertical running the height of the row,
 * `after` is the elbow into the branch node. Drawn per row rather than as one
 * spine on the list, because that is the only way the LAST branch can stop its
 * vertical at the elbow - `last:before:h-*` trims it, and the trim is what makes
 * the bottom corner read as a corner.
 *
 * Spelled out as one literal string. Tailwind reads class names out of source
 * text, so a class assembled at runtime is a class that never gets generated.
 * The 34px offsets are the vertical centre of a branch node.
 */
const BRANCH_CLASS =
  "relative py-2 pl-7 before:absolute before:top-0 before:left-0 before:h-full before:w-0.75 before:bg-comic-ink before:content-[''] last:before:h-[34px] after:absolute after:top-[34px] after:left-0 after:h-0.75 after:w-7 after:bg-comic-ink after:content-['']"

/**
 * The grammar map, drawn as a tree.
 *
 * A flat list of 184 cards answered "what rules exist" and nothing else. The
 * shape of this curriculum is the information: seventeen families, each holding
 * a handful of rules that fail for the same underlying reason, and a learner who
 * can see that present perfect and past perfect hang off one branch has learned
 * something no list could tell them.
 *
 * Leaves spread SIDEWAYS, and that is the whole layout decision. One leaf per
 * row is 184 rows and six screens of scrolling to see a shape that is supposed
 * to be readable at a glance; wrapping them into a block beside their branch
 * node puts the same 184 rules in about a third of the height, and the branch
 * column stays aligned so the trunk still reads as a trunk.
 *
 * Every rule is on the page - no pagination, no drill-down, no collapsing. It is
 * one server-rendered tree of plain elements and CSS elbows: no SVG, no client
 * island, nothing that animates.
 */
export function GrammarPointMap({
  result,
}: {
  result: GrammarPointListResult
}) {
  if (result.points.length === 0)
    return (
      <ComicPanel caption="The map">
        <p className="text-base leading-7 font-semibold">
          Nothing matches those filters. Clear one and try again.
        </p>
      </ComicPanel>
    )

  const byFamily = new Map<GrammarFamily, MapPoint[]>()

  for (const point of result.points) {
    const bucket = byFamily.get(point.family) ?? []

    bucket.push(point)
    byFamily.set(point.family, bucket)
  }

  // One clock for the whole render, so two leaves cannot disagree about whether
  // the same moment counts as due.
  const now = new Date()
  const summary = summariseStudyStatuses(
    result.points.map(point =>
      resolveStudyStatus({ item: point.learner ?? null, now })
    )
  )

  // Canonical family order, so the map does not reshuffle its own branches as
  // filters change.
  const families = GRAMMAR_FAMILIES.filter(family => byFamily.has(family))

  return (
    <ComicPanel caption="The map">
      <div className="grid gap-1">
        <h2 className="font-sans text-2xl leading-none font-black uppercase">
          {result.total} rules, {families.length}{' '}
          {families.length === 1 ? 'family' : 'families'}
        </h2>
        <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
          Rules on one branch fail for the same underlying reason, which is why
          they hang together. Inside a branch the order is Vietnamese
          interference first, so what costs you marks sits at the front. A
          hollow dot is a lesson no human has read.
        </p>
        <p className="font-sans text-sm leading-6 font-black">
          {describeStudySummary(summary)}
        </p>
        {/* A legend, because the strip carries no text of its own. Stated once
            here rather than repeated 184 times on the leaves. */}
        <p className="text-manga-ink-soft text-xs leading-5 font-semibold">
          The bar under each rule is your place on the seven-step review ladder:
          hollow means you have never answered it, filled means you have climbed
          that far, red means it is due now, all seven means you beat it. Green
          is a rule you told us you already know. A dashed line means you
          skipped it.
        </p>
      </div>

      <div>
        <p className="border-comic-ink bg-comic-ink text-comic-paper mb-1 inline-block border-3 px-3 py-2 font-sans text-sm leading-none font-black tracking-[0.1em] uppercase shadow-[4px_4px_0_var(--manga-offset)]">
          {result.total} rules
        </p>

        <ul className="ml-6">
          {families.map(family => {
            const points = byFamily.get(family) ?? []

            return (
              <li
                className={BRANCH_CLASS}
                key={family}
              >
                {/* The branch node keeps a fixed width so every leaf block
                    starts at the same x. Ragged left edges on seventeen blocks
                    would read as seventeen separate lists, not one tree. */}
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2 lg:flex-nowrap">
                  <Link
                    className="border-comic-ink bg-manga-paper-soft text-manga-black flex w-full shrink-0 items-center gap-2 border-3 px-3 py-2 shadow-[3px_3px_0_var(--manga-offset)] transition-transform hover:-translate-y-0.5 sm:w-72"
                    href={`/grammar/points?family=${family}`}
                  >
                    <span className="text-comic-ink block size-8 shrink-0">
                      <FamilySigil family={family} />
                    </span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="font-sans text-base leading-none font-black uppercase">
                        {GRAMMAR_FAMILY_LABELS[family]}
                      </span>
                      <span className="text-manga-ink-soft font-sans text-xs leading-none font-black tracking-[0.1em] uppercase">
                        {points.length} rules - {CREATURE_SPECIES[family]}
                      </span>
                    </span>
                  </Link>

                  <ul className="flex min-w-0 flex-wrap gap-2">
                    {points.map(point => (
                      <li key={point.slug}>
                        <PointLeaf
                          now={now}
                          point={point}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </ComicPanel>
  )
}

/**
 * One rule, as a leaf.
 *
 * Two visible channels, on different axes so they can be read independently:
 *
 *   dot fill        a human has read the lesson     (about the content)
 *   bottom edge     where YOU are with it           (about the learner)
 *
 * Neither is a badge. That was settled when risk was added - "a badge on every
 * leaf is 184 badges and the eye stops seeing them" - and study status is drawn
 * the same way for the same reason.
 *
 * Vietnamese interference has no mark of its own. It used to thicken the left
 * border in red, and that edge lost its meaning as soon as the strip started
 * carrying red too: two different reds on one small card, saying unrelated
 * things. Risk already decides the order inside a branch, so the leading leaves
 * ARE the high-risk ones - and it still reaches screen readers below.
 *
 * The words for both channels go to screen readers through the one `sr-only`
 * block, so nothing is colour-only.
 */
function PointLeaf({ now, point }: { now: Date; point: MapPoint }) {
  const risk = effectiveL1Risk(point)
  const isGhost = point.reviewStatus === 'unverified'
  const study = resolveStudyStatus({ item: point.learner ?? null, now })

  return (
    // No bottom padding, and the padding lives on the content row instead of
    // the card: that is what lets the strip below run edge to edge and read as
    // a border rather than as one more element in a padded box.
    <Link
      className="border-comic-ink text-manga-black hover:bg-manga-pale-red grid gap-1.5 border-2 pt-1.5 transition-transform hover:-translate-y-0.5"
      href={`/grammar/points/${point.slug}`}
    >
      <span className="flex items-center gap-2 px-2.5">
        {/* Filled means a human has read the lesson, hollow means nobody has.
            An outline rather than a colour, so the state survives greyscale. */}
        <span
          aria-hidden="true"
          className={`border-comic-ink size-2.5 shrink-0 rounded-full border-2 ${
            isGhost ? 'bg-transparent' : 'bg-comic-ink'
          }`}
        />
        <span className="sr-only">
          {isGhost ? 'Lesson not verified by a human. ' : ''}
          {risk} Vietnamese interference. {study.label}.{' '}
        </span>

        <span className="font-sans text-sm leading-tight font-black uppercase">
          {point.title}
        </span>

        <span className="text-manga-ink-soft font-mono text-xs leading-none font-black">
          {point.cefrLevel}
        </span>
      </span>

      <GrammarStudyPips status={study} />
    </Link>
  )
}
