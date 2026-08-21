import { cn } from '@/lib/utils'

import { partClass } from './partRig'

/**
 * The six expressions. Anything the sensei can feel, he feels one of these.
 *
 * Six and not more, deliberately: the character is defined by how little his
 * face moves. A sensei with a dozen expressions is a mascot, and a mascot cannot
 * deliver "you have answered this wrong eleven times" and be believed.
 */
export type SenseiExpression =
  'neutral' | 'unimpressed' | 'severe' | 'approving' | 'weary' | 'wary'

/**
 * Expression is a geometry swap, not a colour or an emoji. Every one has to work
 * in greyscale, at 40px, and under the night lamp.
 */
const BROWS: Record<SenseiExpression, string> = {
  approving: 'M30 48h14M64 48h14',
  neutral: 'M30 50h14M64 50h14',
  severe: 'M30 44l14 7M78 44l-14 7',
  unimpressed: 'M30 46l14 3M78 46l-14 3',
  wary: 'M30 44l14 6M64 50h14',
  weary: 'M30 51l14-2M78 51l-14-2',
}

const MOUTHS: Record<SenseiExpression, string> = {
  approving: 'M46 82h16',
  neutral: 'M44 82h20',
  severe: 'M44 84c6-5 14-5 20 0',
  unimpressed: 'M44 83h20',
  wary: 'M46 83h14',
  weary: 'M44 82c6 4 14 4 20 0',
}

/**
 * The examiner. A server component: he appears on every lesson page and must
 * cost nothing on the client.
 */
export function Sensei({
  className,
  expression = 'neutral',
  size = 'md',
}: {
  className?: string
  expression?: SenseiExpression
  size?: 'sm' | 'md'
}) {
  return (
    <span
      className={cn(
        'text-comic-ink comic-idle relative block shrink-0',
        size === 'sm' ? 'w-12' : 'w-20 sm:w-24',
        className
      )}
    >
      <span className="sr-only">The sensei, looking {expression}.</span>
      <svg
        aria-hidden="true"
        className="h-full w-full"
        fill="none"
        role="presentation"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={3}
        viewBox="0 0 108 120"
      >
        {/* Shoulders: the frame that keeps the head from floating. */}
        <path d="M12 118c4-20 18-30 42-30s38 10 42 30" />

        {/* Head. */}
        <path
          className={partClass('body')}
          d="M54 14c18 0 28 12 28 30s-10 44-28 44-28-26-28-44 10-30 28-30Z"
          fill="var(--comic-paper)"
        />

        {/* Topknot. */}
        <path d="M54 14V6M46 10l8-6 8 6" />

        <path d={BROWS[expression]} />

        <ellipse
          className={partClass('eye')}
          cx={40}
          cy={62}
          fill="currentColor"
          rx={3.5}
          ry={4}
          stroke="none"
        />
        <ellipse
          className={partClass('eye')}
          cx={68}
          cy={62}
          fill="currentColor"
          rx={3.5}
          ry={4}
          stroke="none"
        />

        <path d={MOUTHS[expression]} />

        {/* Moustache, which is most of the authority. */}
        <path d="M40 74c5 3 9 3 14 0M68 74c-5 3-9 3-14 0" />
      </svg>
    </span>
  )
}
