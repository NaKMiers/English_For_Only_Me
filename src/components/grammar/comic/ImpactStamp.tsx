import { cn } from '@/lib/utils'

/**
 * The hit marker. A rotated slab of type over speed lines.
 *
 * Text, not an image, so it scales with the type, translates, and reads to a
 * screen reader. `aria-hidden` is deliberately NOT set: the stamp is the verdict
 * on a correct answer, and hiding it would remove the outcome from the
 * accessible page rather than just the decoration.
 */
export function ImpactStamp({
  className,
  tone = 'ink',
  children,
}: {
  children: string
  className?: string
  tone?: 'ink' | 'danger'
}) {
  return (
    <span
      className={cn(
        'border-comic-ink relative inline-flex -rotate-6 items-center border-3 px-3 py-1 font-sans text-xl leading-none font-black tracking-tight uppercase shadow-[4px_4px_0_var(--manga-offset)]',
        tone === 'ink' && 'bg-manga-black text-manga-white',
        tone === 'danger' && 'bg-comic-danger text-manga-white',
        className
      )}
    >
      {children}
    </span>
  )
}
