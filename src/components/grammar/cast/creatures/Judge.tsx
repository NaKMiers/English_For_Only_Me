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
 * The modals species.
 *
 * Squat, wide and immovable, holding a beam that weighs you. Modals are the
 * grammar of degree - must, might, should - so the creature is not fighting
 * you, it is assessing you.
 */
export function Judge({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M8 70h104M60 70V52"
        opacity={0.55}
      />
      <path
        d="M8 70l-6 12h12zM112 70l-6 12h12z"
        opacity={0.55}
      />

      {crown ? <Crown y={6} /> : null}
      {horns ? <Horns y={6} /> : null}

      <path
        className={partClass('body')}
        d="M60 42c20 0 32 11 32 28v20c0 12-4 18-4 26v14H32v-14c0-8-4-14-4-26V70c0-17 12-28 32-28Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M38 58c0-11 10-18 22-18s22 7 22 18v14H38Z" />
      <Eyes
        cy={62}
        left={50}
        right={71}
        secondEye={secondEye}
      />
      <Jaw d="M46 80h28l-4 14H50Z" />

      <Arm d="M28 78 10 70" />
      <Arm d="M92 78l18-8" />
    </CreatureFrame>
  )
}
