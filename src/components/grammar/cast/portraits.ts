import type { GrammarFamily } from '@/modules/grammar/types'

/**
 * Families that have a generated portrait in `public/creatures`.
 *
 * An explicit list rather than a filesystem check: this is read while rendering
 * a server component on every lesson page, and hitting the disk to ask whether a
 * picture exists is both slower and untestable. A missing entry is not a bug, it
 * is the fallback - `CreatureSigil` draws the family mark instead, so the page
 * looks deliberate rather than broken while the cast is incomplete.
 *
 * Typed as `GrammarFamily[]` before the Set so a typo is a compile error here
 * instead of a 404 on a lesson page.
 */
const FAMILIES_WITH_PORTRAIT: GrammarFamily[] = [
  'adjectives-adverbs',
  'articles-determiners',
  'comparatives',
  'conditionals',
  'discourse-connectors',
  'infinitives-gerunds',
  'modals',
  'nouns-quantifiers',
  'passive',
  'phrasal-verbs',
  'prepositions',
  'pronouns',
  'questions-negation',
  'reported-speech',
  'verb-tenses',
  'word-order-inversion',
  // 'relative-clauses' has no art yet: the serpent was never generated.
]

const PORTRAIT_FAMILIES: ReadonlySet<GrammarFamily> = new Set(
  FAMILIES_WITH_PORTRAIT
)

/** The portrait path for a family, or null when there is no art for it. */
export function creaturePortraitSrc(family: GrammarFamily) {
  return PORTRAIT_FAMILIES.has(family) ? `/creatures/${family}.webp` : null
}
