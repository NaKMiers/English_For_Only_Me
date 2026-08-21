import { cn } from '@/lib/utils'
import type { CreatureState } from '@/modules/grammar/presentation/resolveCreatureState'
import type { CreatureSpec } from '@/modules/grammar/presentation/types'

import { Gatekeeper } from './creatures/Gatekeeper'

const RECALL_RUNGS = 7

/**
 * The swap seam.
 *
 * Fixed aspect, theme-aware frame, and a species chosen by name inside. That
 * boundary is the whole reason this component exists: a species can be redrawn,
 * or later replaced by a rendered portrait, with no layout churn anywhere else.
 * Mixed SVG and portrait is a valid end state.
 *
 * A server component. The 184 lesson pages must not ship a client bundle to draw
 * a picture.
 */
export function CreatureSlot({
  className,
  spec,
  state,
}: {
  className?: string
  spec: CreatureSpec
  state: CreatureState
}) {
  const isGhost = state.solidity === 'ghost'

  return (
    <figure
      className={cn(
        'border-comic-ink bg-comic-paper relative grid aspect-4/5 w-full max-w-56 gap-2 border-3 p-2 shadow-[4px_4px_0_var(--manga-offset)]',
        className
      )}
    >
      <div
        className={cn(
          'comic-idle relative grid place-items-center',
          // The ghost is translucent AND dashed AND labelled. Faintness alone
          // would read as a rendering bug rather than as "nobody checked this".
          isGhost && 'comic-ghost',
          state.posture === 'dismissed' && 'opacity-30',
          spec.isDangerous && !isGhost && 'comic-aura',
          state.posture === 'defeated'
            ? 'text-manga-black [&_*]:fill-manga-black'
            : 'text-comic-ink'
        )}
      >
        {renderSpecies(spec)}

        {state.posture === 'dismissed' ? (
          <span
            aria-hidden="true"
            className="bg-comic-ink absolute inset-x-1 top-1/2 h-0.75 -rotate-12"
          />
        ) : null}
      </div>

      {/* Explicit ink. The night theme sets a light colour on the shell for text
          that sits directly on the dark room, and a caption on a lit-paper card
          that inherits it comes out nearly invisible. */}
      <figcaption className="text-manga-black grid gap-1">
        <span className="sr-only">
          {spec.accessibleName}. {POSTURE_LABEL[state.posture]}.{' '}
          {isGhost ? 'Lesson not verified by a human.' : 'Lesson verified.'}
        </span>

        <span
          aria-hidden="true"
          className="font-sans text-[0.6rem] leading-none font-black tracking-[0.12em] uppercase"
        >
          {POSTURE_LABEL[state.posture]}
          {isGhost ? ' - ghost' : ''}
        </span>

        {spec.recallStage != null ? (
          <HealthBar stage={spec.recallStage} />
        ) : null}
      </figcaption>
    </figure>
  )
}

const POSTURE_LABEL: Record<CreatureState['posture'], string> = {
  defeated: 'Defeated',
  dismissed: 'Ignored',
  fighting: 'Fighting',
  skipped: 'Waved through',
  untouched: 'Unmet',
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

function renderSpecies(spec: CreatureSpec) {
  switch (spec.species) {
    case 'gatekeeper':
      return <Gatekeeper menace={spec.menace} />
    default:
      // The other 16 species land after the gate. Until then a point outside
      // articles renders the frame and its accessible name, which is honest -
      // rather than a placeholder pretending to be a creature.
      return <UndrawnSpecies menace={spec.menace} />
  }
}

function UndrawnSpecies({ menace }: { menace: number }) {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      role="presentation"
      stroke="currentColor"
      strokeWidth={3}
      viewBox="0 0 120 140"
    >
      <rect
        height={104}
        opacity={0.35}
        strokeDasharray="7 6"
        width={84}
        x={18}
        y={22}
      />
      <text
        fill="currentColor"
        fontSize={30}
        fontWeight={900}
        opacity={0.5}
        stroke="none"
        textAnchor="middle"
        x={60}
        y={86}
      >
        {menace}
      </text>
    </svg>
  )
}
