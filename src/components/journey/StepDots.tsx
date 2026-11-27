import { cn } from '@/lib/utils'

interface Props {
  className?: string
  /** Fill colour of a done dot, e.g. `bg-accent-green` (default `bg-cta`). */
  doneClassName?: string
  done: number
  /** Accessible text, e.g. "Step 2 of 5". */
  label: string
  total: number
}

/**
 * A small static row of dots, `done` of `total` filled: a word's stage, a
 * recall step, a sentence count. Never clickable.
 */
export function StepDots({
  className,
  doneClassName = 'bg-cta',
  done,
  label,
  total,
}: Props) {
  const filled = Math.max(0, Math.min(done, total))

  return (
    <span
      aria-label={label}
      className={cn('inline-flex items-center gap-1', className)}
      role="img"
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          className={cn(
            'size-2 rounded-full',
            index < filled ? doneClassName : 'bg-line-strong'
          )}
          data-dot={index < filled ? 'done' : 'todo'}
          key={index}
        />
      ))}
    </span>
  )
}
