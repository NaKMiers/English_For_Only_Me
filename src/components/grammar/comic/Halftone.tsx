import { cn } from '@/lib/utils'

/**
 * A standalone screen-tone wash, for filling dead space in a panel.
 *
 * Decoration, and marked as such. Nothing legible may sit on top of it: the
 * pattern's contrast against the panel differs between the two themes, so text
 * over it would be readable in one and marginal in the other.
 */
export function Halftone({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('comic-halftone relative block h-full w-full', className)}
    />
  )
}
