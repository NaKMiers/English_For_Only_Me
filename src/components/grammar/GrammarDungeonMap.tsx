import { ComicPanel } from '@/components/grammar/comic/ComicPanel'
import { cn } from '@/lib/utils'
import {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_COMPLEXITY_LEVELS,
} from '@/modules/grammar/constants'
import {
  resolveDungeonCell,
  type DungeonCell,
} from '@/modules/grammar/presentation/resolveDungeonCell'
import type { GrammarStatsRecord } from '@/modules/grammar/types'

import { DungeonReveal } from './DungeonReveal'

const KIND_TONE: Record<DungeonCell['kind'], string> = {
  cleared: 'bg-comic-ink text-comic-paper',
  empty: 'bg-transparent text-manga-ink-soft',
  fogged: 'bg-comic-fog text-manga-ink-soft',
  shaky: 'bg-manga-paper-soft text-manga-black',
  solid: 'bg-manga-pale-red text-manga-black',
  strong: 'bg-comic-ink/75 text-comic-paper',
  weak: 'bg-comic-danger text-manga-white',
}

/**
 * The dungeon: six level columns by five difficulty rows.
 *
 * Reading the diagonal is the obvious move and it is the wrong one. The cell
 * that matters is TOP-LEFT - beginner level, maximum difficulty - where
 * articles, the zero article and countability sit. Rules met in the first month
 * and still wrong years later. A curriculum ordered by level files all of those
 * under "beginner, done" and never raises them again, which is the single
 * reason this module keeps level and difficulty as separate axes.
 *
 * Two accessibility defects inherited from the old progress map are fixed here.
 * Every state now carries a GLYPH as well as a fill, so the grid survives
 * greyscale and colour blindness; and the per-cell detail moved out of `title=`,
 * which is unreachable by keyboard and by touch, into a real accessible
 * description. It stays a genuine `<table>` with scoped headers.
 */
export function GrammarDungeonMap({
  progressCells,
}: {
  progressCells: GrammarStatsRecord['progressCells']
}) {
  const byKey = new Map(
    progressCells.map(cell => [`${cell.cefrLevel}:${cell.complexity}`, cell])
  )

  return (
    <ComicPanel caption="The dungeon">
      <h2 className="font-sans text-2xl leading-none font-black uppercase">
        Level against difficulty
      </h2>
      <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
        Columns are when you meet a rule. Rows are how hard it is to actually
        get right. The top-left corner is the one that costs you marks: beginner
        rules that are genuinely brutal. Each cell shows your average ladder
        stage, so a fully-started cell can still be weak if those rules keep
        resetting.
      </p>

      <DungeonReveal>
        {/* Right and bottom padding is room for the offset shadow. Inside a
            scroll container a box shadow does not extend the scrollable area, so
            without it the app's signature ledge gets clipped off the table. */}
        <div className="overflow-x-auto pr-1.5 pb-1.5">
          {/*
            Border weights follow the app, not the table's own logic: 3px on the
            frame like every card and panel, 2px on the interior grid like every
            chip and badge, and a 3px rule under the header row the same way a
            section heading is underlined. `border-collapse` resolves each shared
            edge in favour of the WIDER border, which is what makes one table
            border and one cell border produce that hierarchy without a wrapper.
          */}
          <table className="border-comic-ink w-full min-w-136 border-collapse border-3 shadow-[4px_4px_0_var(--manga-offset)]">
            <caption className="sr-only">
              Grammar coverage by CEFR level and difficulty. Each cell reports
              how many rules it holds, how many you have started and mastered,
              your average recall stage, and how many of its lessons no human
              has verified.
            </caption>
            <thead>
              <tr>
                <th
                  className="border-comic-ink bg-manga-paper-soft border-2 border-b-3 p-2 font-sans text-xs font-black uppercase"
                  scope="col"
                >
                  Difficulty
                </th>
                {GRAMMAR_CEFR_LEVELS.map(level => (
                  <th
                    className="border-comic-ink bg-manga-paper-soft border-2 border-b-3 p-2 font-sans text-xs font-black uppercase"
                    key={level}
                    scope="col"
                  >
                    {level}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...GRAMMAR_COMPLEXITY_LEVELS].reverse().map(complexity => (
                <tr key={complexity}>
                  <th
                    className="border-comic-ink bg-manga-paper-soft border-2 p-2 font-sans text-xs font-black uppercase"
                    scope="row"
                  >
                    {complexity}/5
                  </th>
                  {GRAMMAR_CEFR_LEVELS.map(level => {
                    const source = byKey.get(`${level}:${complexity}`)
                    const cell = resolveDungeonCell(
                      source ?? {
                        averageStage: null,
                        cefrLevel: level,
                        complexity,
                        dangerous: 0,
                        mastered: 0,
                        total: 0,
                        touched: 0,
                        unverified: 0,
                      }
                    )

                    return (
                      <td
                        className={cn(
                          'border-comic-ink relative border-2 p-1 text-center align-middle',
                          KIND_TONE[cell.kind],
                          // The cursed corner gets a red ring, not just a
                          // colour: it has to be findable at a glance.
                          //
                          // An INSET shadow rather than an outline. An outline
                          // paints outside the border box, so it sat on top of
                          // the neighbouring cells' borders and read as a
                          // rendering fault - and a permanent 3px outline is
                          // also exactly this app's focus ring, which made a
                          // static cell look keyboard-focused.
                          cell.isCursed &&
                            'shadow-[inset_0_0_0_3px_var(--comic-danger)]',
                          cell.isDangerous && 'font-black'
                        )}
                        key={`${level}-${complexity}`}
                      >
                        {/* The full sentence, for screen readers and for the
                            visible tooltip below. Replaces `title=`. */}
                        <span className="sr-only">{cell.label}</span>

                        <span
                          aria-hidden="true"
                          className="grid justify-items-center gap-0.5 leading-none"
                        >
                          <StateDial
                            fill={cell.fill}
                            kind={cell.kind}
                          />
                          {cell.value ? (
                            <span className="font-mono text-[0.6rem] font-black">
                              {cell.value}
                            </span>
                          ) : null}
                          {cell.allGhosts && cell.kind !== 'empty' ? (
                            <span className="text-[0.55rem] font-black tracking-tight uppercase opacity-70">
                              ghost
                            </span>
                          ) : null}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DungeonReveal>

      <dl className="grid gap-1 text-xs font-black uppercase sm:grid-cols-2">
        <Legend
          fill={0}
          kind="fogged"
          label="Never entered"
        />
        <Legend
          fill={1}
          kind="weak"
          label="Weak - below stage 2"
        />
        <Legend
          fill={2}
          kind="shaky"
          label="Shaky - stage 2+"
        />
        <Legend
          fill={3}
          kind="solid"
          label="Solid - stage 3.5+"
        />
        <Legend
          fill={4}
          kind="strong"
          label="Strong - stage 5+"
        />
        <Legend
          fill={4}
          kind="cleared"
          label="All mastered"
        />
      </dl>

      <p className="text-manga-ink-soft text-xs leading-5 font-semibold">
        A cell marked <strong>ghost</strong> holds only lessons no human has
        read. A cell with a red outline is the cursed corner: A1 rules at
        maximum difficulty.
      </p>
    </ComicPanel>
  )
}

function Legend({
  fill,
  kind,
  label,
}: {
  fill: DungeonCell['fill']
  kind: DungeonCell['kind']
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <dt className="border-comic-ink flex h-6 w-6 shrink-0 items-center justify-center border-2">
        <StateDial
          fill={fill}
          kind={kind}
        />
      </dt>
      <dd className="text-manga-ink-soft">{label}</dd>
    </div>
  )
}

/**
 * The state, drawn.
 *
 * A dial with 0 to 4 quarters filled, plus two special cases that are not
 * points on the scale: `fogged` is a question mark because the cell has not
 * been entered at all, and `cleared` is a cross because everything in it is
 * dead. Vector rather than a text glyph, so it does not depend on the reader's
 * font having a half-filled circle - and so it stays legible at the size a grid
 * cell allows, which the glyph version did not.
 */
function StateDial({
  fill,
  kind,
}: {
  fill: DungeonCell['fill']
  kind: DungeonCell['kind']
}) {
  if (kind === 'empty') return null

  if (kind === 'fogged')
    return (
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 16 16"
      >
        <circle
          cx={8}
          cy={8}
          r={6.5}
          stroke="currentColor"
          strokeDasharray="3 2"
          strokeWidth={2}
        />
      </svg>
    )

  if (kind === 'cleared')
    return (
      <svg
        aria-hidden="true"
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 16 16"
      >
        <path
          d="M3 3l10 10M13 3L3 13"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={2.5}
        />
      </svg>
    )

  // Quarters, clockwise from the top.
  const QUADRANTS = [
    'M8 8V1.5A6.5 6.5 0 0 1 14.5 8Z',
    'M8 8h6.5A6.5 6.5 0 0 1 8 14.5Z',
    'M8 8v6.5A6.5 6.5 0 0 1 1.5 8Z',
    'M8 8H1.5A6.5 6.5 0 0 1 8 1.5Z',
  ]

  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      {QUADRANTS.slice(0, fill).map(d => (
        <path
          d={d}
          fill="currentColor"
          key={d}
        />
      ))}
      <circle
        cx={8}
        cy={8}
        r={6.5}
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  )
}
