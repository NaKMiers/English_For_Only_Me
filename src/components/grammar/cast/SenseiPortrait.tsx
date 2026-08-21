import Image from 'next/image'

import { cn } from '@/lib/utils'
import type { SenseiExpression } from '@/modules/grammar/presentation/senseiExpressions'

/**
 * The examiner, as a drawn portrait.
 *
 * Six expressions and not more, deliberately: the character is defined by how
 * little his face moves. A sensei with a dozen expressions is a mascot, and a
 * mascot cannot deliver "you have answered this wrong eleven times" and be
 * believed.
 *
 * A raster, not a rig. The hand-written SVG bust it replaces cost a dozen nodes
 * and an idle timeline per instance and still looked like a diagram of a face.
 * One `next/image` per expression per page is cheaper than that and does not
 * animate, and the four expressions a lesson page uses are four cached files.
 *
 * Framed on purpose. The art carries its own paper background, so an unframed
 * cream square floating on a panel reads as a rendering fault; a border and an
 * offset shadow make it an inset panel, which is what it is.
 */
export function SenseiPortrait({
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
        'border-comic-ink relative block shrink-0 border-3 shadow-[3px_3px_0_var(--manga-offset)]',
        size === 'sm' ? 'w-12' : 'w-20 sm:w-24',
        className
      )}
    >
      <span className="sr-only">The sensei, looking {expression}.</span>
      <Image
        alt=""
        className="block h-auto w-full"
        height={256}
        src={`/sensei/${expression}.webp`}
        width={256}
      />
    </span>
  )
}
