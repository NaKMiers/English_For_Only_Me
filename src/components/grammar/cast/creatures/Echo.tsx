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
 * The reported-speech species.
 *
 * The same head repeated behind itself at falling opacity. Reported speech is a
 * sentence quoting a sentence, and each retelling sits a little further from
 * whatever was actually said.
 */
export function Echo({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M60 34c13 0 21 8 21 20"
        opacity={0.34}
      />
      <path
        d="M60 20c20 0 32 12 32 30"
        opacity={0.18}
      />

      {crown ? <Crown y={8} /> : null}
      {horns ? <Horns y={8} /> : null}

      <path
        className={partClass('body')}
        d="M60 48c14 0 23 10 23 24v32l5 26H32l5-26V72c0-14 9-24 23-24Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M47 62c0-9 6-14 13-14s13 5 13 14v12H47Z" />
      <Eyes
        cy={64}
        left={53}
        right={68}
        secondEye={secondEye}
      />
      <Jaw d="M51 76h18l-3 10h-12Z" />

      <Arm d="M37 86 23 98l3 12" />
      <Arm d="M83 86l14 12-3 12" />
    </CreatureFrame>
  )
}
