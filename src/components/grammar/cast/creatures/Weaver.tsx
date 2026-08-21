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
 * The discourse-connectors species.
 *
 * A small body carried on many legs, threads running off in every direction
 * holding other things together. Connectors carry no meaning of their own; they
 * carry the joins.
 */
export function Weaver({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M44 114 26 128M52 116 42 134M68 116l10 18M76 114l18 14"
        opacity={0.5}
      />
      <path
        d="M14 46c16 10 30 10 46 0s30-10 46 0"
        opacity={0.3}
      />

      {crown ? <Crown y={10} /> : null}
      {horns ? <Horns y={10} /> : null}

      <path
        className={partClass('body')}
        d="M60 50c12 0 20 8 20 20v16c0 8-4 12-4 18l2 10H42l2-10c0-6-4-10-4-18V70c0-12 8-20 20-20Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M49 62c0-8 5-13 11-13s11 5 11 13v11H49Z" />
      <Eyes
        cy={64}
        left={54}
        right={67}
        rx={5}
        ry={6}
        secondEye={secondEye}
      />
      <Jaw d="M53 77h14l-2 9h-10Z" />

      <Arm d="M40 82 20 90l-6 14" />
      <Arm d="M80 82l20 8 6 14" />
    </CreatureFrame>
  )
}
