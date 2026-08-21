import Image from 'next/image'

import { cn } from '@/lib/utils'
import type { CreatureState } from '@/modules/grammar/presentation/resolveCreatureState'
import type { CreatureSpec } from '@/modules/grammar/presentation/types'

import { partClass } from './partRig'
import { creaturePortraitSrc } from './portraits'
import { FamilySigil } from './sigils'

const RECALL_RUNGS = 7

const POSTURE_LABEL: Record<CreatureState['posture'], string> = {
  defeated: 'Defeated',
  dismissed: 'Ignored',
  fighting: 'Fighting',
  skipped: 'Waved through',
  untouched: 'Unmet',
}

/**
 * The bestiary plate.
 *
 * Two renderings of the same information, chosen by `size`, which is the whole
 * reason this component is one component:
 *
 * - `plate` is the lesson page and the drill. It shows the generated portrait
 *   for the family, because there is room for a picture and the learner is
 *   looking at exactly one point.
 * - `sm` is the index card, and it stays a flat family MARK. Forty portraits on
 *   one scroll is forty decodes for pictures rendered at 64px, where the ink
 *   detail mushes anyway. The index needs to be skimmable, not illustrated.
 *
 * Either way the surrounding facts are identical - menace, posture, ghost state,
 * recall ladder - and every one of them is also written out, so nothing here
 * depends on being able to see the picture. A family with no art falls back to
 * its mark at plate size too, so an incomplete cast looks deliberate.
 *
 * A server component. The 184 lesson pages must not ship a client bundle to
 * draw a box.
 */
export function CreatureSigil({
  className,
  size = 'sm',
  spec,
  state,
}: {
  className?: string
  size?: 'sm' | 'plate'
  spec: CreatureSpec
  state: CreatureState
}) {
  const isGhost = state.solidity === 'ghost'
  const isPlate = size === 'plate'
  const portrait = isPlate ? creaturePortraitSrc(spec.family) : null

  return (
    <figure
      className={cn(
        'border-comic-ink bg-comic-paper text-comic-ink relative grid shrink-0 border-3',
        isPlate
          ? 'w-full max-w-56 gap-2 p-2 shadow-[4px_4px_0_var(--manga-offset)]'
          : 'w-16 gap-1 p-1.5 shadow-[3px_3px_0_var(--manga-offset)]',
        spec.isDangerous && !isGhost && 'border-comic-danger',
        className
      )}
    >
      <div
        className={cn(
          'relative grid aspect-square place-items-center',
          // The ghost stays translucent AND dashed AND labelled. Faintness on
          // its own reads as a rendering bug rather than as "nobody checked
          // this lesson".
          //
          // A portrait fades less than a mark. Nearly every point is unverified
          // today, so 45% would mean the whole cast is only ever seen at
          // half strength - the dashed frame and the label carry the state, and
          // the picture stays a picture.
          isGhost && 'border-comic-ink border-2 border-dashed',
          isGhost && (portrait ? 'opacity-80' : 'opacity-45'),
          state.posture === 'defeated' && 'text-manga-black',
          state.posture === 'dismissed' && 'opacity-30'
        )}
      >
        {/* Both branches carry the crest class, so `CreatureMotion` has
            something to pulse on a wrong answer whichever one renders. The part
            rig outlived the hand-drawn cast. */}
        {portrait ? (
          <Image
            alt=""
            className={cn(
              'block h-full w-full object-contain',
              partClass('crest')
            )}
            height={256}
            src={portrait}
            width={256}
          />
        ) : (
          <FamilySigil
            className={partClass('crest')}
            family={spec.family}
          />
        )}

        {state.posture === 'dismissed' ? (
          <span
            aria-hidden="true"
            className="bg-comic-ink absolute inset-x-0 top-1/2 h-0.75 -rotate-12"
          />
        ) : null}
      </div>

      {/* Explicit ink: the night theme lights the shell text for labels sitting
          on the dark room, and a caption on a lit-paper card that inherits it
          comes out nearly invisible. */}
      <figcaption className="text-manga-black grid gap-1">
        <span className="sr-only">
          {spec.accessibleName}. {POSTURE_LABEL[state.posture]}.{' '}
          {isGhost ? 'Lesson not verified by a human.' : 'Lesson verified.'}
        </span>

        <span
          aria-hidden="true"
          className={cn(
            'block font-sans leading-tight font-black uppercase',
            isPlate
              ? 'text-[0.6rem] tracking-[0.12em]'
              : 'text-[0.5rem] tracking-[0.08em]'
          )}
        >
          {POSTURE_LABEL[state.posture]}
          {isGhost ? ' - ghost' : ''}
        </span>

        {isPlate ? (
          <span
            aria-hidden="true"
            className="block font-sans text-[0.6rem] leading-tight font-black tracking-[0.12em] uppercase"
          >
            {spec.species} - menace {spec.menace}/5
          </span>
        ) : null}

        {spec.recallStage != null ? (
          <HealthBar stage={spec.recallStage} />
        ) : null}
      </figcaption>
    </figure>
  )
}

/**
 * The recall ladder as a health bar: seven rungs, filled from the right, so
 * progress reads as damage done. Rungs are separate boxes rather than a
 * percentage width, because "stage 4 of 7" is a countable fact and a smooth bar
 * would hide which rung the learner is actually on.
 */
function HealthBar({ stage }: { stage: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex gap-0.5"
    >
      {Array.from({ length: RECALL_RUNGS }, (_, index) => (
        <span
          className={cn(
            'border-comic-ink h-1.5 flex-1 border',
            index < RECALL_RUNGS - stage ? 'bg-comic-danger' : 'bg-transparent'
          )}
          key={index}
        />
      ))}
    </span>
  )
}
