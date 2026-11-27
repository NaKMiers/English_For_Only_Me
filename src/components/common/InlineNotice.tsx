import { CircleAlert, Info } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  /** Optional control on the right, e.g. a retry button. */
  action?: ReactNode
  children: ReactNode
  className?: string
  /** `error` is always `danger` with an alert icon, never colour alone. */
  tone?: 'info' | 'error'
}

/** A status or error banner inside a page or panel. */
export function InlineNotice({
  action,
  children,
  className,
  tone = 'info',
}: Props) {
  const Icon = tone === 'error' ? CircleAlert : Info

  return (
    <div
      className={cn(
        'rounded-control flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm',
        tone === 'error'
          ? 'bg-danger-soft text-danger'
          : 'bg-tint-soft text-ink border-line border',
        className
      )}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon
        aria-hidden="true"
        className="size-4 shrink-0"
      />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  )
}
