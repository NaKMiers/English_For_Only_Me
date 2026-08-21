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
 * The phrasal-verbs species.
 *
 * Halves that plainly came off different animals, bolted together and working
 * anyway. A phrasal verb is a verb welded to a preposition to mean something
 * neither of them means, and it never looks like it should function.
 */
export function Chimera({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M44 118l-8 18M74 118l12 18"
        opacity={0.45}
      />

      {crown ? <Crown y={4} /> : null}
      {horns ? <Horns y={4} /> : null}

      <path
        className={partClass('body')}
        d="M60 44c15 0 24 10 24 24v20l8 30H60V44Zm0 0c-12 0-19 12-19 26v18l-9 30h28V44Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M48 58c0-9 5-14 12-14s13 5 13 14v12H48Z" />
      <Eyes
        cy={60}
        left={53}
        right={68}
        secondEye={secondEye}
      />
      <Jaw d="M52 72h17l-4 11h-10Z" />

      <Arm d="M36 80 14 68l6 18-10 8" />
      <Arm d="M84 88l24 8-12 12" />
    </CreatureFrame>
  )
}
