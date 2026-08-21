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
 * The infinitives-gerunds species.
 *
 * Split down the middle, each half built differently, joined at a seam. To stop
 * smoking and to stop to smoke are both correct English and mean opposite
 * things, and nothing in the words tells you which one you have written.
 */
export function Shapeshifter({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      {crown ? <Crown y={4} /> : null}
      {horns ? <Horns y={4} /> : null}

      <path
        className={partClass('body')}
        d="M60 44c18 0 28 12 28 28v30l4 26H60V44Zm0 0c-13 0-21 12-21 28v30l-7 26h28V44Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M47 58c0-9 6-14 13-14s13 5 13 14v12H47Z" />
      <Eyes
        cy={61}
        left={53}
        right={68}
        secondEye={secondEye}
      />
      <Jaw d="M51 72h18l-3 11h-12Z" />
      {/* Drawn after the body: the body is filled, so a marking
          placed before it is simply covered. */}
      <path
        d="M60 44v84"
        opacity={0.4}
      />

      <Arm d="M37 84 21 94l3 14" />
      <Arm d="M88 84l14 10-3 14" />
    </CreatureFrame>
  )
}
