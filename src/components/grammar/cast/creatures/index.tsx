import type { GrammarFamily } from '@/modules/grammar/types'
import type { MenaceTier } from '@/modules/grammar/presentation/types'

import { Chimera } from './Chimera'
import { Chronomancer } from './Chronomancer'
import { Contortionist } from './Contortionist'
import { Echo } from './Echo'
import { Gatekeeper } from './Gatekeeper'
import { Inquisitor } from './Inquisitor'
import { Judge } from './Judge'
import { Mimic } from './Mimic'
import { Oracle } from './Oracle'
import { Puppet } from './Puppet'
import { Serpent } from './Serpent'
import { Shapeshifter } from './Shapeshifter'
import { Shifter } from './Shifter'
import { Swarm } from './Swarm'
import { Trickster } from './Trickster'
import { Twin } from './Twin'
import { Weaver } from './Weaver'

/**
 * Family to drawing.
 *
 * Keyed by FAMILY rather than by the species name so this map and
 * `CREATURE_SPECIES` cannot drift into disagreement - one of them would then
 * silently fall through to a placeholder. A `Record` over the family union also
 * makes adding an eighteenth family a type error here, which is the right place
 * to find out.
 */
export const CREATURE_COMPONENTS: Record<
  GrammarFamily,
  (props: { menace: MenaceTier }) => React.ReactElement
> = {
  'adjectives-adverbs': Shifter,
  'articles-determiners': Gatekeeper,
  comparatives: Twin,
  conditionals: Oracle,
  'discourse-connectors': Weaver,
  'infinitives-gerunds': Shapeshifter,
  modals: Judge,
  'nouns-quantifiers': Swarm,
  passive: Puppet,
  'phrasal-verbs': Chimera,
  prepositions: Trickster,
  pronouns: Mimic,
  'questions-negation': Inquisitor,
  'relative-clauses': Serpent,
  'reported-speech': Echo,
  'verb-tenses': Chronomancer,
  'word-order-inversion': Contortionist,
}
