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
 * The nouns-quantifiers species.
 *
 * Not one body: a cluster of them, none of which is the real one. Countability is
 * the whole problem here - English insists on knowing whether a thing is one or
 * many before you are allowed to mention it, and Vietnamese never asks.
 */
export function Swarm({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M20 46a8 8 0 1 0 .1 0M100 56a7 7 0 1 0 .1 0M26 108a6 6 0 1 0 .1 0M96 114a5 5 0 1 0 .1 0"
        opacity={0.45}
      />

      {crown ? <Crown y={0} /> : null}
      {horns ? <Horns y={0} /> : null}

      <path
        className={partClass('body')}
        d="M60 40c14 0 22 8 22 20 0 10-6 14-6 22 0 10 8 14 8 24 0 10-10 16-24 16s-24-6-24-16c0-10 8-14 8-24 0-8-6-12-6-22 0-12 8-20 22-20Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M46 54c0-8 6-14 14-14s14 6 14 14v12H46Z" />
      <Eyes
        cy={57}
        left={53}
        right={68}
        rx={5}
        ry={6}
        secondEye={secondEye}
      />
      <Jaw d="M51 70h18l-3 10h-12Z" />

      <Arm d="M38 82 22 90l2 10" />
      <Arm d="M82 82l16 8-2 10" />
    </CreatureFrame>
  )
}
