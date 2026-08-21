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
 * The adjectives-adverbs species.
 *
 * An outline caught mid-change, with ghosts of itself one notch off in each
 * direction. Adjectives and adverbs describe by modifying, so the creature is
 * drawn in the act of being modified.
 */
export function Shifter({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M52 46c-11 4-17 13-17 26v32"
        opacity={0.3}
      />
      <path
        d="M68 46c11 4 17 13 17 26v32"
        opacity={0.3}
      />

      {crown ? <Crown y={4} /> : null}
      {horns ? <Horns y={4} /> : null}

      <path
        className={partClass('body')}
        d="M60 44c14 0 23 10 23 24v34l6 30H31l6-30V68c0-14 9-24 23-24Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M47 58c0-9 6-15 13-15s13 6 13 15v12H47Z" />
      <Eyes
        cy={61}
        left={53}
        right={68}
        secondEye={secondEye}
      />
      <Jaw d="M51 72h18l-3 11h-12Z" />

      <Arm d="M37 82 21 94l3 14" />
      <Arm d="M83 82l16 12-3 14" />
    </CreatureFrame>
  )
}
