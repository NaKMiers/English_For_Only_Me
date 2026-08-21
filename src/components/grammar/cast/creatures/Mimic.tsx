import type { MenaceTier } from '@/modules/grammar/presentation/types'

import { partClass } from '../partRig'
import {
  Arm,
  CreatureFrame,
  Crown,
  Eyes,
  FaceField,
  Horns,
  Jaw,
  menaceMarks,
} from './creatureFrame'

/**
 * The pronouns species.
 *
 * Its own duplicate stands half a step behind it, never quite aligned. A pronoun
 * is a word standing in for something else, and the stand-in is never the thing
 * it replaced.
 */
export function Mimic({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M68 48c13 0 21 10 21 24v40l5 20H70"
        opacity={0.32}
      />
      <path
        d="M78 60c0-6 4-10 9-10"
        opacity={0.24}
      />

      {crown ? <Crown y={-2} /> : null}
      {horns ? <Horns y={-2} /> : null}

      <path
        className={partClass('body')}
        d="M52 44c13 0 21 10 21 24v40l5 24H26l5-24V68c0-14 8-24 21-24Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M40 56c0-8 5-14 12-14s12 6 12 14v12H40Z" />
      <Eyes
        cy={59}
        left={46}
        right={59}
        rx={5}
        ry={6}
        secondEye={secondEye}
      />
      <Jaw d="M44 72h16l-3 10h-10Z" />

      <Arm d="M32 84 18 98l4 12" />
      <Arm d="M73 84l12 14-4 12" />
    </CreatureFrame>
  )
}
