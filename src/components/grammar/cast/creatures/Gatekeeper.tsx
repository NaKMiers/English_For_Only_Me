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
 * The articles-determiners species.
 *
 * A hooded thing standing in a doorway it will not let you through, which is
 * what an article is to a Vietnamese speaker: a gate with no visible lock. Drawn
 * first on purpose - `definite-article-the` is A1, difficulty 5, high
 * interference and currently a ghost, so it exercises every state the rig has to
 * support.
 */
export function Gatekeeper({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      {/* The doorway it guards. Static: the creature moves, the gate does not. */}
      <path
        d="M18 132V52a42 42 0 0 1 84 0v80"
        opacity={0.25}
      />

      {crown ? <Crown y={2} /> : null}
      {horns ? <Horns y={12} /> : null}

      <path
        className={partClass('body')}
        d="M60 30c18 0 30 14 30 32v10c0 8-4 14-4 22l6 38H28l6-38c0-8-4-14-4-22V62c0-18 12-32 30-32Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M38 62c0-14 10-24 22-24s22 10 22 24v8H38Z" />
      <Eyes
        cy={62}
        left={50}
        right={71}
        secondEye={secondEye}
      />
      <Jaw d="M46 82h28l-4 12H50Z" />

      <Arm d="M30 88 12 104l8 12" />
      <Arm d="M90 88l18 16-8 12" />
    </CreatureFrame>
  )
}
