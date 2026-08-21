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
 * The passive species.
 *
 * Hanging, feet off the ground, limbs slack. In the passive the subject stops
 * acting and gets acted upon, which is precisely a marionette: something is
 * being done to it.
 */
export function Puppet({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      <path
        d="M42 44V4M78 44V4M60 40V4"
        opacity={0.32}
      />
      <path
        d="M48 124l-6 12M72 124l6 12"
        opacity={0.45}
      />

      {crown ? <Crown y={2} /> : null}
      {horns ? <Horns y={2} /> : null}

      <path
        className={partClass('body')}
        d="M60 44c12 0 20 8 20 20v30c0 8-6 12-6 18l2 12H44l2-12c0-6-6-10-6-18V64c0-12 8-20 20-20Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M48 56c0-8 5-13 12-13s12 5 12 13v11H48Z" />
      <Eyes
        cy={58}
        left={54}
        right={67}
        rx={5}
        ry={6}
        secondEye={secondEye}
      />
      <Jaw d="M53 71h14l-2 9h-10Z" />

      <Arm d="M40 78 26 96l10 6" />
      <Arm d="M80 78l14 18-10 6" />
    </CreatureFrame>
  )
}
