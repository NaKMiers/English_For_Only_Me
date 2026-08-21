import { cn } from '@/lib/utils'
import type { GrammarFamily } from '@/modules/grammar/types'

/**
 * One flat mark per family, for surfaces that render dozens at once.
 *
 * A sigil is deliberately NOT a creature. A creature is a jointed drawing with
 * a face, a rig, and idle life, and forty of them on one scroll is the reason
 * the bestiary index crawled: forty inline SVG subtrees, forty animation
 * timelines, forty filtered layers. A sigil is one or two strokes in a fixed
 * box - enough to say "another one of those" at a glance, cheap enough that the
 * count stops mattering.
 *
 * Same rules as the creatures: one viewBox, one stroke weight, colour from
 * `currentColor` only. Families differ in SHAPE, never in weight or palette, so
 * the marks stay comparable down the page.
 */
export const FAMILY_SIGILS: Record<GrammarFamily, string[]> = {
  // A dial: the same thing, turned up or down.
  'adjectives-adverbs': ['M10 34h28', 'M19 34v-9M29 34v-17'],
  // A gate. Something decides whether the noun gets through.
  'articles-determiners': ['M12 38V14h24v24', 'M12 26h24'],
  // Two of a kind, one taller.
  comparatives: ['M16 38V22h6v16', 'M26 38V12h6v26'],
  // A fork in the road.
  conditionals: ['M24 38V26', 'M24 26 12 12M24 26l12-14'],
  // A knot tying two runs of text together.
  'discourse-connectors': ['M10 20h13a5 5 0 0 1 0 10H10', 'M38 30H25'],
  // One shape becoming another.
  'infinitives-gerunds': ['M10 34 20 16l10 18Z', 'M32 26a6 6 0 1 0 0 .1'],
  // A balance. Permission weighed out.
  modals: ['M24 12v26', 'M12 20h24', 'M12 20l-3 8h6zM36 20l-3 8h6z'],
  // Many, and one.
  'nouns-quantifiers': [
    'M14 18h.1M22 18h.1M30 18h.1M18 26h.1M26 26h.1',
    'M24 34h.1',
  ],
  // Strings, and something moved by them.
  passive: ['M12 12h24', 'M18 12v10M30 12v10', 'M16 26h16v10H16z'],
  // Two beasts fused into one verb.
  'phrasal-verbs': ['M10 36V20h12v16Z', 'M22 36 32 16l8 20Z'],
  // In, on, at: a box and the thing that will not sit still in it.
  prepositions: ['M12 22h16v14H12z', 'M32 12v14l-6-4'],
  // A reflection that does not quite match.
  pronouns: ['M20 12v26', 'M12 18h6M12 32h6', 'M28 16h8v16h-8'],
  // A hook, and its refusal.
  'questions-negation': ['M18 18a6 6 0 1 1 6 7v4', 'M12 36l22-24'],
  // A clause that coils back on the noun.
  'relative-clauses': ['M10 30c6-12 12 12 18 0s8-10 10-4', 'M36 18h.1'],
  // The same words, one room further away.
  'reported-speech': ['M10 16h14v10H16l-6 6V16Z', 'M28 22h10v8h-4l-4 4v-4'],
  // A clock. The one family that is entirely about when.
  'verb-tenses': ['M24 11a13 13 0 1 0 .1 0Z', 'M24 17v8l7 4'],
  // Two words trading places.
  'word-order-inversion': ['M12 19h20l-5-5M36 29H16l5 5'],
}

/**
 * The shared shell. Fixed viewBox and weight so a page of sigils reads as one
 * alphabet, and `aria-hidden` because every sigil sits beside the same fact
 * written out in text.
 */
export function FamilySigil({
  className,
  family,
}: {
  className?: string
  family: GrammarFamily
}) {
  return (
    <svg
      aria-hidden="true"
      className={cn('h-full w-full', className)}
      fill="none"
      role="presentation"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      viewBox="0 0 48 48"
    >
      {FAMILY_SIGILS[family].map(d => (
        <path
          d={d}
          key={d}
        />
      ))}
    </svg>
  )
}
