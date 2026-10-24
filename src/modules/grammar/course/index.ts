import 'server-only'

import { buildCourseLookup } from './courseLookup'
import type { GrammarUnit } from './types'
import { UNIT_01 } from './units/u01'
import { UNIT_02 } from './units/u02'
import { UNIT_03 } from './units/u03'
import { UNIT_04 } from './units/u04'
import { UNIT_05 } from './units/u05'
import { UNIT_06 } from './units/u06'
import { UNIT_07 } from './units/u07'
import { UNIT_08 } from './units/u08'
import { UNIT_09 } from './units/u09'
import { UNIT_10 } from './units/u10'
import { UNIT_11 } from './units/u11'
import { UNIT_12 } from './units/u12'

/**
 * The whole course. Server-only: pages hand the client one lesson's cards (or
 * the path view model) as props, so ~700 cards of text never ship in the JS
 * bundle.
 */
export const GRAMMAR_COURSE: GrammarUnit[] = [
  UNIT_01,
  UNIT_02,
  UNIT_03,
  UNIT_04,
  UNIT_05,
  UNIT_06,
  UNIT_07,
  UNIT_08,
  UNIT_09,
  UNIT_10,
  UNIT_11,
  UNIT_12,
]

/**
 * Renamed lesson/card ids, old -> new. Progress and miss rows are keyed on ids,
 * so a rename without an alias here would silently orphan a learner's stars.
 */
export const COURSE_ID_ALIASES: Record<string, string> = {}

export const grammarCourse = buildCourseLookup(
  GRAMMAR_COURSE,
  COURSE_ID_ALIASES
)
