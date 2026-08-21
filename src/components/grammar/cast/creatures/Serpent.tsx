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
 * The relative-clauses species.
 *
 * One long coil with no legs and no clear end. A relative clause is a sentence
 * growing out of the middle of another sentence, and it can always keep going.
 */
export function Serpent({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M32 128c16 2 28-2 32-8"
        opacity={0.45}
      />

      {crown ? <Crown y={-10} /> : null}
      {horns ? <Horns y={-10} /> : null}

      <path
        className={partClass('body')}
        d="M60 34c12 0 20 8 20 18 0 14-24 14-24 28s26 12 26 26-16 22-34 22c-10 0-16-4-16-4"
        fill="var(--comic-paper)"
      />

      <FaceField d="M48 46c0-8 5-13 12-13s12 5 12 13v10H48Z" />
      <Eyes
        cy={47}
        left={54}
        right={67}
        rx={5}
        ry={5}
        secondEye={secondEye}
      />
      <Jaw d="M52 60h16l-3 9h-10Z" />

      <Arm d="M78 96c8 4 12 10 10 16" />
      <Arm d="M42 68c-8 4-12 8-11 14" />
    </CreatureFrame>
  )
}
