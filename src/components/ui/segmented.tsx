'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface SegmentedOption<Value extends string> {
  /** Rendered icon (an element). */
  icon?: ReactNode
  label: ReactNode
  /** Accessible name when the label is an icon only. */
  ariaLabel?: string
  disabled?: boolean
  value: Value
}

interface Props<Value extends string> {
  className?: string
  /** Accessible name of the whole group. */
  label: string
  onChange: (value: Value) => void
  options: SegmentedOption<Value>[]
  /** `sm` is for dense work-screen chrome on wide screens; 44px on phones. */
  size?: 'md' | 'sm'
  value: Value
}

/**
 * A row of mutually exclusive toggles (mode, pane, part, filter). Selected
 * uses `cta`, idle pops on hover, every segment is 44px tall on phones.
 * Raw buttons: segmented toggles rely on `aria-pressed` (documented raw
 * exception in frontend-ui.md).
 */
export function Segmented<Value extends string>({
  className,
  label,
  onChange,
  options,
  size = 'md',
  value,
}: Props<Value>) {
  return (
    <div
      aria-label={label}
      className={cn(
        'border-line bg-surface inline-flex max-w-full flex-wrap items-center gap-1 rounded-full border p-1',
        className
      )}
      role="group"
    >
      {options.map(option => {
        const selected = option.value === value

        return (
          <button
            aria-label={option.ariaLabel}
            aria-pressed={selected}
            className={cn(
              'soft-press inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium disabled:opacity-55',
              size === 'sm' && 'md:min-h-8 md:px-2.5',
              selected
                ? 'bg-cta text-cta-fg'
                : 'hover-pop text-ink-soft hover:text-ink'
            )}
            data-selected={selected ? '' : undefined}
            disabled={option.disabled}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.icon ? (
              <span
                aria-hidden="true"
                className="grid size-4 place-items-center [&_svg]:size-4"
              >
                {option.icon}
              </span>
            ) : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
