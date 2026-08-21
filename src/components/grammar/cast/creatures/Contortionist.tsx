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
 * The word-order-inversion species.
 *
 * Upside down, head at the bottom, weight at the top, and apparently fine with
 * it. Inversion takes a sentence you can already build and turns it inside out
 * for emphasis.
 */
export function Contortionist({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      {crown ? <Crown y={76} /> : null}
      {horns ? <Horns y={76} /> : null}

      <path
        className={partClass('body')}
        d="M60 128c-14 0-23-10-23-24V70l-6-28h58l-6 28v34c0 14-9 24-23 24Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M47 104c0-9 6-14 13-14s13 5 13 14v12H47Z" />
      <Eyes
        cy={112}
        left={53}
        right={68}
        secondEye={secondEye}
      />
      <Jaw d="M51 92h18l-3-10h-12Z" />
      {/* Drawn after the body: the body is filled, so a marking
          placed before it is simply covered. */}
      <path
        d="M32 42c14 6 42 6 56 0"
        opacity={0.4}
      />

      <Arm d="M37 84 21 74l3-14" />
      <Arm d="M83 84l16-10-3-14" />
    </CreatureFrame>
  )
}
