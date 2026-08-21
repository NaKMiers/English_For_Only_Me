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
 * The prepositions species.
 *
 * A small creature inside a box, with arrows pointing in, on, at and under it at
 * once. Prepositions are the corner of English with the least logic available
 * to a learner, so it is drawn as that: surrounded by directions, none of them
 * derivable from the others.
 */
export function Trickster({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M20 40h80v80H20z"
        opacity={0.32}
      />
      <path
        d="M6 80h10M114 80h-10M60 26v10M60 134v-8"
        opacity={0.5}
      />
      <path
        d="M14 74l5 6-5 6M106 74l-5 6 5 6"
        opacity={0.5}
      />

      {crown ? <Crown y={14} /> : null}
      {horns ? <Horns y={14} /> : null}

      <path
        className={partClass('body')}
        d="M60 56c11 0 18 7 18 18v24l4 18H38l4-18V74c0-11 7-18 18-18Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M49 66c0-7 5-12 11-12s11 5 11 12v10H49Z" />
      <Eyes
        cy={68}
        left={54}
        right={67}
        rx={5}
        ry={5}
        secondEye={secondEye}
      />
      <Jaw d="M53 80h14l-2 9h-10Z" />

      <Arm d="M42 88 30 98l2 10" />
      <Arm d="M78 88l12 10-2 10" />
    </CreatureFrame>
  )
}
