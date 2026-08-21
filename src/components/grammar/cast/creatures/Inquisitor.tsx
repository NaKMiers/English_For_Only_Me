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
 * The questions-negation species.
 *
 * Leaning in, with a hook where the top of its head should be. English forms a
 * question by rearranging the sentence and adding a verb that means nothing on
 * its own - a very strange shape if your language just puts a particle at the
 * end and stops.
 */
export function Inquisitor({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M56 34c0-11 8-17 16-13s6 15-3 19-6 8-6 8"
        opacity={0.55}
      />

      {crown ? <Crown y={4} /> : null}
      {horns ? <Horns y={4} /> : null}

      <path
        className={partClass('body')}
        d="M66 48c13 0 20 10 19 24l-2 34 8 26H28l16-26 2-34c1-14 7-24 20-24Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M54 60c0-8 6-14 13-14s12 6 12 14l-1 12H53Z" />
      <Eyes
        cy={62}
        left={60}
        right={73}
        rx={5}
        ry={6}
        secondEye={secondEye}
      />
      <Jaw d="M57 74h18l-3 10h-12Z" />

      <Arm d="M46 84 28 94l1 12" />
      <Arm d="M85 84l14 12-3 12" />
    </CreatureFrame>
  )
}
