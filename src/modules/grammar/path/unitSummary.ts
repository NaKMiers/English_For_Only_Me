import type { CefrLevel } from '@/modules/grammar/course/types'

import type {
  GrammarPathView,
  PathLesson,
  PathNext,
  PathUnit,
} from './buildGrammarPath'

/**
 * Small derived views the course page needs on top of `buildGrammarPath`:
 * per-unit progress for the unit index, which units start open, and the
 * entry points next to the Continue card. Pure, so the page stays a plain
 * function of the path view.
 *
 *   GrammarPathView ──▶ summarizeUnit(unit)    ─▶ index rows, unit headers
 *                   ├─▶ initialOpenUnitIds()  ─▶ Collapsible open state
 *                   ├─▶ firstDueLesson()      ─▶ "Review due" entry point
 *                   └─▶ pathLevels()          ─▶ level filter chips
 */

export interface UnitSummary {
  id: string
  order: number
  level: CefrLevel
  title: string
  state: PathUnit['state']
  /** Lessons finished (passed, due or mastered). */
  done: number
  total: number
  /** 0 to 100, lessons done over lessons. */
  percent: number
  stars: number
  maxStars: number
  dueCount: number
}

const STARS_PER_LESSON = 3

export function isLessonDone(lesson: PathLesson) {
  return lesson.state !== 'open' && lesson.state !== 'locked'
}

export function summarizeUnit(unit: PathUnit): UnitSummary {
  const total = unit.lessons.length
  const done = unit.lessons.filter(isLessonDone).length

  return {
    done,
    dueCount: unit.lessons.filter(lesson => lesson.state === 'due').length,
    id: unit.id,
    level: unit.level,
    maxStars: total * STARS_PER_LESSON,
    order: unit.order,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    stars: unit.lessons.reduce((sum, lesson) => sum + lesson.stars, 0),
    state: unit.state,
    title: unit.title,
    total,
  }
}

/**
 * Units that start unfolded: the one the learner is working on. With no
 * current unit (a fresh or an empty course) the first unit opens instead.
 */
export function initialOpenUnitIds(path: GrammarPathView): string[] {
  const current =
    path.units.find(unit => unit.id === path.currentUnitId) ?? path.units[0]

  return current ? [current.id] : []
}

/** The first lesson waiting for review, in path order. */
export function firstDueLesson(units: PathUnit[]): PathLesson | null {
  for (const unit of units) {
    const lesson = unit.lessons.find(item => item.state === 'due')

    if (lesson) return lesson
  }

  return null
}

/** CEFR levels present in the course, in path order, without repeats. */
export function pathLevels(units: PathUnit[]): CefrLevel[] {
  return [...new Set(units.map(unit => unit.level))]
}

/** The unit the next step lives in, for the Continue card's eyebrow. */
export function unitOfNext(
  path: GrammarPathView,
  next: PathNext = path.next
): PathUnit | null {
  if (next.kind === 'checkpoint')
    return path.units.find(unit => unit.id === next.unitId) ?? null

  if (next.kind === 'lesson' || next.kind === 'review')
    return (
      path.units.find(unit =>
        unit.lessons.some(lesson => lesson.id === next.lessonId)
      ) ?? null
    )

  return path.units.find(unit => unit.id === path.currentUnitId) ?? null
}

export interface LevelProgress {
  done: number
  level: CefrLevel
  total: number
}

/**
 * Lessons done per CEFR level, in path order: the steps of the level
 * staircase on the grammar page.
 */
export function levelProgress(units: PathUnit[]): LevelProgress[] {
  const levels = new Map<CefrLevel, LevelProgress>()

  for (const unit of units) {
    const row = levels.get(unit.level) ?? {
      done: 0,
      level: unit.level,
      total: 0,
    }

    row.done += unit.lessons.filter(isLessonDone).length
    row.total += unit.lessons.length
    levels.set(unit.level, row)
  }

  return [...levels.values()]
}

/** The first level not yet finished, or null when every level is climbed. */
export function currentLevel(levels: LevelProgress[]): LevelProgress | null {
  return levels.find(row => row.done < row.total) ?? null
}
