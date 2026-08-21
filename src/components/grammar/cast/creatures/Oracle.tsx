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
 * The conditionals species.
 *
 * Thin, tall and antlered: one body with several futures leaving the head. A
 * conditional is a fork in a sentence, and the creature is drawn as the fork.
 */
export function Oracle({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M60 45V28M60 28 44 14M60 28l16-14M44 14 38 6M76 14l6-8"
        opacity={0.5}
      />

      {crown ? <Crown y={4} /> : null}
      {horns ? <Horns y={4} /> : null}

      <path
        className={partClass('body')}
        d="M60 46c10 0 16 8 16 20v50l4 22H40l4-22V66c0-12 6-20 16-20Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M47 58c0-8 6-13 13-13s13 5 13 13v11H47Z" />
      <Eyes
        cy={60}
        left={53}
        right={68}
        rx={5}
        ry={6}
        secondEye={secondEye}
      />
      <Jaw d="M52 73h16l-2 9h-12Z" />

      <Arm d="M44 82 30 96l3 12" />
      <Arm d="M76 82l14 14-3 12" />
    </CreatureFrame>
  )
}
