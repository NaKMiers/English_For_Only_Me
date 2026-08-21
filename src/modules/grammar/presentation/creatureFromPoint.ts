import { GRAMMAR_FAMILY_LABELS } from '@/modules/grammar/constants'
import { effectiveL1Risk } from '@/modules/grammar/taxonomy/effectiveL1Risk'
import type {
  GrammarComplexity,
  GrammarFamily,
  GrammarL1Risk,
} from '@/modules/grammar/types'

import type { CreatureSpec, MenaceTier } from './types'

/**
 * One species per grammar family.
 *
 * A species is a drawing contract, not decoration: the learner should recognise
 * "another one of those" across the bestiary, which is what makes 184 points
 * feel like a world rather than a list. The names map to part-rig variants in
 * `components/grammar/cast/creatures`.
 */
export const CREATURE_SPECIES: Record<GrammarFamily, string> = {
  'adjectives-adverbs': 'shifter',
  'articles-determiners': 'gatekeeper',
  comparatives: 'twin',
  conditionals: 'oracle',
  'discourse-connectors': 'weaver',
  'infinitives-gerunds': 'shapeshifter',
  modals: 'judge',
  'nouns-quantifiers': 'swarm',
  passive: 'puppet',
  'phrasal-verbs': 'chimera',
  prepositions: 'trickster',
  pronouns: 'mimic',
  'questions-negation': 'inquisitor',
  'relative-clauses': 'serpent',
  'reported-speech': 'echo',
  'verb-tenses': 'chronomancer',
  'word-order-inversion': 'contortionist',
}

const RISK_BONUS: Record<GrammarL1Risk, number> = {
  high: 2,
  low: 0,
  medium: 1,
}

/**
 * How dangerous this point looks, 1 to 5.
 *
 * Both axes feed it, which is the point. `complexity` alone would draw future
 * perfect continuous as the fiercest thing in the game and articles as a
 * starter creature - exactly backwards for this learner. Adding the effective
 * risk means the A1 rule that actually beats them is drawn as the boss it is.
 *
 * Reads the EFFECTIVE risk, so once the builder has judged a point brutal, it
 * looks brutal.
 */
export function resolveMenaceTier(point: {
  complexity: GrammarComplexity
  l1Risk: GrammarL1Risk
  l1RiskObserved?: GrammarL1Risk | null
}): MenaceTier {
  const raw = Math.round(
    (point.complexity + RISK_BONUS[effectiveL1Risk(point)] * 1.5) / 1.6
  )

  return Math.min(5, Math.max(1, raw)) as MenaceTier
}

/**
 * Build the creature for a point.
 *
 * `accessibleName` is assembled here rather than in the component because it is
 * the same information the drawing conveys, and the two must not be able to
 * drift. Every status a creature can show has to be readable without seeing it.
 */
export function creatureFromPoint({
  point,
  recallStage,
}: {
  point: {
    complexity: GrammarComplexity
    family: GrammarFamily
    l1Risk: GrammarL1Risk
    l1RiskObserved?: GrammarL1Risk | null
    title: string
  }
  recallStage: number | null
}): CreatureSpec {
  const risk = effectiveL1Risk(point)
  const stagePart =
    recallStage == null ? 'untouched' : `stage ${recallStage} of 7`

  return {
    accessibleName: `${point.title}, ${GRAMMAR_FAMILY_LABELS[point.family]}, ${stagePart}, ${risk} interference`,
    family: point.family,
    isDangerous: risk === 'high',
    menace: resolveMenaceTier(point),
    recallStage,
    species: CREATURE_SPECIES[point.family],
    title: point.title,
  }
}
