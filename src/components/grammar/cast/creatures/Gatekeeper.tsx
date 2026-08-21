import type { MenaceTier } from '@/modules/grammar/presentation/types'

import { partClass } from '../partRig'

/**
 * The articles-and-determiners species.
 *
 * A hooded thing standing in a doorway it will not let you through, which is
 * what an article is to a Vietnamese speaker: a gate with no visible lock. It is
 * drawn first on purpose - `definite-article-the` is A1, difficulty 5, high
 * interference and currently a ghost, so it exercises every state the rig has to
 * support.
 *
 * Colour comes entirely from `currentColor` and the `--comic-*` tokens, so one
 * class on the wrapper restyles the whole creature and the night remap moves it
 * for free.
 */
export function Gatekeeper({ menace }: { menace: MenaceTier }) {
  const spikes = menace >= 3
  const secondEye = menace >= 4
  const crown = menace === 5

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      role="presentation"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      viewBox="0 0 120 140"
    >
      {/* The doorway it guards. Static: the creature moves, the gate does not. */}
      <path
        d="M18 132V52a42 42 0 0 1 84 0v80"
        opacity={0.25}
      />

      {crown ? (
        <path
          className={partClass('crest')}
          d="M40 30 46 16l7 11 7-13 7 13 7-11 6 14"
        />
      ) : null}

      {spikes ? (
        <g className={partClass('crest')}>
          <path d="M34 54 24 40M86 54 96 40" />
          <path d="M30 76 16 70M90 76 104 70" />
        </g>
      ) : null}

      {/* Hood and mass. */}
      <path
        className={partClass('body')}
        d="M60 30c18 0 30 14 30 32v10c0 8-4 14-4 22l6 38H28l6-38c0-8-4-14-4-22V62c0-18 12-32 30-32Z"
        fill="var(--comic-paper)"
      />

      {/* Hood shadow: the face is in there somewhere. */}
      <path
        d="M38 62c0-14 10-24 22-24s22 10 22 24v8H38Z"
        fill="var(--comic-ink)"
        opacity={0.82}
        stroke="none"
      />

      <ellipse
        className={partClass('eye')}
        cx={secondEye ? 50 : 60}
        cy={62}
        fill="var(--comic-danger)"
        rx={6}
        ry={7}
        stroke="none"
      />
      {secondEye ? (
        <ellipse
          className={partClass('eye')}
          cx={71}
          cy={62}
          fill="var(--comic-danger)"
          rx={6}
          ry={7}
          stroke="none"
        />
      ) : null}

      {/* Jaw. Pivots from its top edge via `comic-part--jaw`. */}
      <path
        className={partClass('jaw')}
        d="M46 82h28l-4 12H50Z"
        fill="var(--comic-paper)"
      />

      <g className={partClass('arm')}>
        <path d="M30 88 12 104l8 12" />
      </g>
      <g className={partClass('arm')}>
        <path d="M90 88l18 16-8 12" />
      </g>
    </svg>
  )
}
