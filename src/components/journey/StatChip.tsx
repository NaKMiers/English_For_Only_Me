import { ChevronRight, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { AppModuleKey } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import { cn } from '@/lib/utils'

interface StatChipProps {
  className?: string
  /** Link target: the chip pops on hover. Without it the chip stays still. */
  href?: string | null
  icon: LucideIcon
  /** Extra icon classes, e.g. `fill-current` for a star. */
  iconClassName?: string
  /** What the number counts. Visible from `sm`, `sr-only` below. */
  label: string
  /** `lg` is the home simple view's bigger chip; same component. */
  size?: 'md' | 'lg'
  /** Module whose accent colours the icon. */
  tone?: AppModuleKey
  value: string
}

/**
 * One number with its icon in a pill. Static chips never pop, linked chips
 * always do (with a small chevron), so clickable and not clickable are easy
 * to tell apart. Use inside a `StatStrip` (a `dl`).
 */
export function StatChip({
  className,
  href,
  icon: Icon,
  iconClassName,
  label,
  size = 'md',
  tone,
  value,
}: StatChipProps) {
  const body = (
    <>
      <dt className="flex items-center gap-1.5">
        <Icon
          aria-hidden="true"
          className={cn(
            'shrink-0',
            size === 'lg' ? 'size-6' : 'size-4',
            tone ? MODULE_THEMES[tone].accent : 'text-ink-soft',
            iconClassName
          )}
        />
        <span
          className={cn(
            'text-ink-soft max-sm:sr-only',
            size === 'lg' ? 'text-sm' : 'text-xs'
          )}
        >
          {label}
        </span>
      </dt>
      <dd
        className={cn(
          'font-sans font-medium tabular-nums',
          size === 'lg' ? 'text-2xl leading-none' : 'text-sm'
        )}
      >
        {value}
      </dd>
    </>
  )
  const shared = cn(
    'bg-surface/80 flex min-h-9 items-center gap-2 rounded-full py-1 pr-3 pl-2',
    size === 'lg' && 'min-h-14 gap-3 pr-5 pl-3',
    className
  )

  if (href)
    return (
      <Link
        className={cn(shared, 'soft-press hover-pop hover:bg-surface group')}
        data-stat-chip="link"
        href={href}
      >
        {body}
        <ChevronRight
          aria-hidden="true"
          className="text-ink-soft size-3.5 shrink-0"
        />
      </Link>
    )

  return (
    <div
      className={shared}
      data-stat-chip="static"
    >
      {body}
    </div>
  )
}

interface StatStripProps {
  children: ReactNode
  className?: string
  /** Accessible name for the list of numbers. */
  label?: string
}

/**
 * The row of stat chips on a journey card. At most 4 chips (checked by the
 * landing budget tests, not at runtime).
 */
export function StatStrip({ children, className, label }: StatStripProps) {
  return (
    <dl
      aria-label={label}
      className={cn('flex flex-wrap gap-1.5', className)}
      data-stat-strip=""
    >
      {children}
    </dl>
  )
}
