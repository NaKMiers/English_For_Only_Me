import type { GrammarSessionMode } from '@/modules/grammar/constants'

import type { GrammarPathView, PathNext, PathUnit } from './buildGrammarPath'

/**
 * What a session end needs from the path the page loaded: the unit the
 * session worked in (for the "lesson 3 of 5 done" journey line), where the
 * path went next, and the first lesson of the unit after it (a passed
 * checkpoint unlocks that unit). Computed on the server, plain data.
 */
export interface PlayerJourney {
  next: PathNext
  nextUnitFirstLessonId: string | null
  unit: PathUnit | null
}

export function buildPlayerJourney(
  path: GrammarPathView,
  mode: GrammarSessionMode,
  targetId: string
): PlayerJourney {
  const unitIndex = path.units.findIndex(unit =>
    mode === 'checkpoint'
      ? unit.id === targetId
      : unit.lessons.some(lesson => lesson.id === targetId)
  )
  const unit = mode === 'weak' || unitIndex < 0 ? null : path.units[unitIndex]

  return {
    next: path.next,
    nextUnitFirstLessonId:
      unitIndex >= 0
        ? (path.units[unitIndex + 1]?.lessons[0]?.id ?? null)
        : null,
    unit: unit ?? null,
  }
}
