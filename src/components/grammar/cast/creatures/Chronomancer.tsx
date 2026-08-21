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
 * The verb-tenses species.
 *
 * A narrow tower of a thing with a clock for a chest whose hands disagree.
 * A tense system files the same event under a different time without the event
 * changing, and Vietnamese does that with a particle and no reshaping of the
 * verb at all.
 */
export function Chronomancer({ menace }: { menace: MenaceTier }) {
  const { crown, horns, secondEye } = menaceMarks(menace)

  return (
    <CreatureFrame>
      {crown ? <Crown y={0} /> : null}
      {horns ? <Horns y={0} /> : null}

      <path
        className={partClass('body')}
        d="M60 26c11 0 18 9 18 22v76c0 6-8 10-18 10s-18-4-18-10V48c0-13 7-22 18-22Z"
        fill="var(--comic-paper)"
      />

      <FaceField d="M46 40c0-9 6-15 14-15s14 6 14 15v12H46Z" />
      <Eyes
        cy={44}
        left={53}
        right={68}
        rx={5}
        ry={5}
        secondEye={secondEye}
      />
      <Jaw d="M50 56h20l-3 10H53Z" />
      {/* Drawn after the body: the body is filled, so a marking
          placed before it is simply covered. */}
      <path
        d="M60 88a13 13 0 1 0 0.1 0M60 88v-9M60 88l7 5"
        opacity={0.5}
      />

      <Arm d="M42 74 22 88l4 14" />
      <Arm d="M78 74l20 14-4 14" />
    </CreatureFrame>
  )
}
