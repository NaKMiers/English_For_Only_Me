import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  /** What sits in the middle: a number, an icon. */
  children?: ReactNode
  className?: string
  /** 0 to 100. */
  percent: number
  /** Ring colour class (stroke uses currentColor), e.g. `text-brand`. */
  ringClassName?: string
  size?: number
  strokeWidth?: number
}

/**
 * A small circular progress meter. Decorative: the caller states the same
 * progress in text next to it (or in an aria-label), so the SVG is hidden.
 */
export function ProgressRing({
  children,
  className,
  percent,
  ringClassName = 'text-brand',
  size = 40,
  strokeWidth = 4,
}: Props) {
  const radius = (size - strokeWidth) / 2
  const value = Math.min(100, Math.max(0, percent))

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center font-sans text-xs font-medium tabular-nums',
        className
      )}
      style={{ height: size, width: size }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 -rotate-90"
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        <circle
          className="text-line-strong"
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        {value > 0 ? (
          <circle
            className={cn('motion-draw', ringClassName)}
            cx={size / 2}
            cy={size / 2}
            fill="none"
            pathLength={1}
            r={radius}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            // Inline, so it beats `.motion-draw`'s full-length dash array;
            // the draw-in animation still runs on the dash offset.
            style={{ strokeDasharray: `${value / 100} 1` }}
          />
        ) : null}
      </svg>
      <span className="relative">{children}</span>
    </span>
  )
}
