import { cn } from '@/lib/utils'

/** Radiating motion lines. Decoration; see `Halftone` for why it is marked so. */
export function SpeedLines({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('comic-speedlines relative block h-full w-full', className)}
    />
  )
}
