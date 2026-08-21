/**
 * The part rig: the contract between an SVG species and the animation code.
 *
 * Every creature is drawn from the same named parts. `CreatureMotion` never
 * knows which species it is animating - it queries these class names inside its
 * own subtree and animates whatever it finds. That is what makes 17 species and
 * one animation implementation possible, and what lets a species be redrawn (or
 * later swapped for a rendered portrait) without touching a line of motion code.
 *
 * A part is optional by design. A species with no jaw simply has nothing matched
 * by the jaw selector, and the hit sequence plays without that channel rather
 * than throwing.
 */
export const CREATURE_PARTS = {
  /** The mass that breathes and takes the recoil. Every species has one. */
  body: 'comic-part--body',
  /** Blinks on idle, squeezes shut on a hit. */
  eye: 'comic-part--eye',
  /** Opens on a hit. Pivots from its top edge, not its centre. */
  jaw: 'comic-part--jaw',
  /** Swings on a hit. */
  arm: 'comic-part--arm',
  /** Whatever marks danger - spikes, horns, a crown. Pulses with the aura. */
  crest: 'comic-part--crest',
} as const

export type CreaturePart = keyof typeof CREATURE_PARTS

/** Every part needs `comic-part` too, or its transforms pivot off the viewBox. */
export function partClass(part: CreaturePart, extra?: string) {
  const base = part === 'jaw' ? 'comic-part--jaw' : 'comic-part'

  return [base, CREATURE_PARTS[part], extra].filter(Boolean).join(' ')
}

export function partSelector(part: CreaturePart) {
  return `.${CREATURE_PARTS[part]}`
}
