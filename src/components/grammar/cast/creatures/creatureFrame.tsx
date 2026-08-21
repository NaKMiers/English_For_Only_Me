import type { ReactNode } from 'react'

import type { MenaceTier } from '@/modules/grammar/presentation/types'

import { partClass } from '../partRig'

/**
 * The shared shell every species draws inside.
 *
 * One viewBox, one stroke weight, one set of colour sources. Seventeen species
 * hand-tuning their own would give a bestiary where creatures cannot be
 * compared - and comparison is the whole point of a bestiary. Species differ in
 * SILHOUETTE and in how they are put together, never in line weight or palette.
 */
export function CreatureFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      role="presentation"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      viewBox="0 0 120 140"
    >
      {children}
    </svg>
  )
}

/**
 * Menace, drawn the same way on every species: horns at 3, a second eye at 4,
 * a crown at 5.
 *
 * Shared so the tier is READABLE ACROSS the bestiary. If each species signalled
 * danger its own way the learner would have to learn seventeen separate scales,
 * and the tier would stop being information.
 */
export function menaceMarks(menace: MenaceTier) {
  return {
    crown: menace === 5,
    horns: menace >= 3,
    secondEye: menace >= 4,
  }
}

/** A crown of spikes, for the worst points in the curriculum. */
export function Crown({ y = 0 }: { y?: number }) {
  return (
    <path
      className={partClass('crest')}
      d={`M38 ${28 + y} 45 ${13 + y}l7 11 8 -13 8 13 7 -11 7 15`}
    />
  )
}

/** Horns. The mid-tier danger mark. */
export function Horns({ y = 0 }: { y?: number }) {
  return (
    <g className={partClass('crest')}>
      <path d={`M34 ${42 + y} 23 ${26 + y}M86 ${42 + y} 97 ${26 + y}`} />
    </g>
  )
}

/**
 * The dark field a face sits in.
 *
 * Without it the eyes float on bare paper and every species reads as a blank
 * sheet with two dots. This is most of what makes a creature look like it is
 * looking at you.
 */
export function FaceField({ d }: { d: string }) {
  return (
    <path
      d={d}
      fill="var(--comic-ink)"
      opacity={0.82}
      stroke="none"
    />
  )
}

/**
 * A jaw. Pivots from its TOP edge, which is what `comic-part--jaw` is for -
 * centre-pivoting a jaw makes the creature chew its own head.
 */
export function Jaw({ d }: { d: string }) {
  return (
    <path
      className={partClass('jaw')}
      d={d}
      fill="var(--comic-paper)"
    />
  )
}

/** A limb. Grouped so the rotation on a hit has something to pivot. */
export function Arm({ d }: { d: string }) {
  return (
    <g className={partClass('arm')}>
      <path d={d} />
    </g>
  )
}

/**
 * Eyes. One or two depending on the tier, positioned by the species.
 *
 * Filled with `--comic-danger` rather than ink: the eyes are the one part that
 * should read as lit from inside, and it makes the danger token do double duty
 * instead of introducing another colour.
 */
export function Eyes({
  cy,
  left,
  right,
  rx = 6,
  ry = 7,
  secondEye,
}: {
  cy: number
  left: number
  right: number
  rx?: number
  ry?: number
  secondEye: boolean
}) {
  if (!secondEye)
    return (
      <ellipse
        className={partClass('eye')}
        cx={(left + right) / 2}
        cy={cy}
        fill="var(--comic-danger)"
        rx={rx}
        ry={ry}
        stroke="none"
      />
    )

  return (
    <>
      <ellipse
        className={partClass('eye')}
        cx={left}
        cy={cy}
        fill="var(--comic-danger)"
        rx={rx}
        ry={ry}
        stroke="none"
      />
      <ellipse
        className={partClass('eye')}
        cx={right}
        cy={cy}
        fill="var(--comic-danger)"
        rx={rx}
        ry={ry}
        stroke="none"
      />
    </>
  )
}
