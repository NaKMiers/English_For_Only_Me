import { MangaPanel } from '@/components/common/MangaPanel'
import {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_COMPLEXITY_LEVELS,
} from '@/modules/grammar/constants'
import type { GrammarStatsRecord } from '@/modules/grammar/types'

/**
 * Colour by COMPETENCE, not completion.
 *
 * Average ladder stage is the signal once points have been touched: a cell full
 * of stage-1 points is weak even though it is fully "started", and a cell at
 * stage 5 is strong even with nothing formally mastered. Falls back to a
 * touched/untouched distinction before there is any stage data.
 */
function cellTone({
  averageStage,
  mastered,
  total,
  touched,
}: {
  averageStage: number | null
  mastered: number
  total: number
  touched: number
}) {
  if (total === 0) return 'bg-manga-paper-soft/40 text-manga-ink-soft/50'
  if (mastered === total) return 'bg-manga-black text-manga-white'

  if (averageStage !== null) {
    if (averageStage >= 5) return 'bg-manga-black/80 text-manga-white'
    if (averageStage >= 3.5) return 'bg-manga-pale-red text-manga-black'
    if (averageStage >= 2) return 'bg-yellow-100 text-yellow-950'

    return 'bg-manga-red text-manga-white'
  }

  if (touched > 0) return 'bg-manga-white text-manga-black'

  return 'bg-manga-white/60 text-manga-ink-soft'
}

/**
 * The level-by-difficulty grid.
 *
 * Six CEFR columns by five difficulty rows. The conventional reading is the
 * diagonal, but the cell that matters is TOP-LEFT: beginner level, maximum
 * difficulty. That is where articles, the zero article, and countability sit -
 * rules a learner meets in their first month and is still getting wrong years
 * later. A single progress bar sorted by level would file all of those under
 * "beginner, done" and never surface them again.
 */
export function GrammarProgressMap({
  progressCells,
}: {
  progressCells: GrammarStatsRecord['progressCells']
}) {
  const byKey = new Map(
    progressCells.map(cell => [`${cell.cefrLevel}:${cell.complexity}`, cell])
  )

  return (
    <MangaPanel
      eyebrow="Progress map"
      title="Level against difficulty"
    >
      <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
        Columns are when you meet a rule. Rows are how hard it is to get right.
        The top-left corner is the interesting one: beginner rules that are
        genuinely difficult. Each cell shows your average ladder stage there, so
        a fully-started cell can still be red if those points keep resetting.
      </p>

      <div className="overflow-x-auto">
        <table className="border-manga-black w-full min-w-[34rem] border-collapse border-2">
          <thead>
            <tr>
              <th className="border-manga-black bg-manga-paper-soft border-2 p-2 font-sans text-xs font-black uppercase">
                Difficulty
              </th>
              {GRAMMAR_CEFR_LEVELS.map(level => (
                <th
                  className="border-manga-black bg-manga-paper-soft border-2 p-2 font-sans text-xs font-black uppercase"
                  key={level}
                >
                  {level}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...GRAMMAR_COMPLEXITY_LEVELS].reverse().map(complexity => (
              <tr key={complexity}>
                <th className="border-manga-black bg-manga-paper-soft border-2 p-2 font-sans text-xs font-black uppercase">
                  {complexity}/5
                </th>
                {GRAMMAR_CEFR_LEVELS.map(level => {
                  const cell = byKey.get(`${level}:${complexity}`)
                  const total = cell?.total ?? 0
                  const mastered = cell?.mastered ?? 0
                  const touched = cell?.touched ?? 0
                  const averageStage = cell?.averageStage ?? null

                  return (
                    <td
                      className={`border-manga-black border-2 p-2 text-center font-mono text-xs font-black ${cellTone(
                        { averageStage, mastered, total, touched }
                      )}`}
                      key={`${level}-${complexity}`}
                      title={`${level}, difficulty ${complexity}: ${total} points, ${touched} started, ${mastered} mastered${
                        averageStage === null
                          ? ''
                          : `, average stage ${averageStage}/7`
                      }`}
                    >
                      {total === 0
                        ? '-'
                        : averageStage === null
                          ? `0/${total}`
                          : `${averageStage}`}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-black uppercase">
        <span className="border-manga-black bg-manga-black text-manga-white border-2 px-2 py-0.5">
          All mastered
        </span>
        <span className="border-manga-black bg-manga-black/80 text-manga-white border-2 px-2 py-0.5">
          Strong (stage 5+)
        </span>
        <span className="border-manga-black bg-manga-pale-red border-2 px-2 py-0.5">
          Solid (3.5+)
        </span>
        <span className="border-manga-black border-2 bg-yellow-100 px-2 py-0.5 text-yellow-950">
          Shaky (2+)
        </span>
        <span className="border-manga-black bg-manga-red text-manga-white border-2 px-2 py-0.5">
          Weak (below 2)
        </span>
        <span className="border-manga-black bg-manga-white/60 text-manga-ink-soft border-2 px-2 py-0.5">
          Untouched
        </span>
      </div>
    </MangaPanel>
  )
}
