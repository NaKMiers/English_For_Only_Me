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
 * The comparatives species.
 *
 * Two bodies fused at the hip, deliberately unequal. A comparative only exists
 * relative to something else, so a single creature could not carry the idea at
 * all.
 */
export function Twin({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M84 66c11 0 17 8 17 20v28l3 18H70"
        opacity={0.7}
      />
      <path
        d="M84 84a4 4 0 1 0 .1 0"
        opacity={0.9}
      />

      {crown ? <Crown y={-4} /> : null}
      {horns ? <Horns y={-4} /> : null}

      <path
        className={partClass('body')}
        d="M42 40c13 0 21 10 21 24v44l4 24H17l4-24V64c0-14 8-24 21-24Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M31 54c0-9 5-14 11-14s11 5 11 14v12H31Z" />
      <Eyes
        cy={57}
        left={37}
        right={48}
        rx={5}
        ry={6}
        secondEye={secondEye}
      />
      <Jaw d="M35 70h14l-2 10H37Z" />

      <Arm d="M21 80 8 94l3 12" />
      <Arm d="M63 84l12 12-2 12" />
    </CreatureFrame>
  )
}
