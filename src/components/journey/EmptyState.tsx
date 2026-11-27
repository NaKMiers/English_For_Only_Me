import type { ReactNode } from 'react'

import { ActionButton } from '@/components/ui/ActionButton'
import { cn } from '@/lib/utils'

interface Props {
  /** The one next useful action. */
  action?: { href: string; icon?: ReactNode; label: string }
  body?: ReactNode
  className?: string
  /** A rendered icon or the buddy mascot. */
  icon?: ReactNode
  title: string
}

/**
 * An empty list or queue: what the state means and the one next useful
 * action, never a bare paragraph.
 */
export function EmptyState({ action, body, className, icon, title }: Props) {
  return (
    <div
      className={cn(
        'border-line bg-surface rounded-panel grid justify-items-center gap-3 border border-dashed p-6 text-center',
        className
      )}
      data-empty-state=""
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="bg-tint text-ink-soft grid size-12 place-items-center rounded-full [&_svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <p className="font-sans text-lg font-medium">{title}</p>
      {body ? (
        <div className="text-ink-soft max-w-md text-sm">{body}</div>
      ) : null}
      {action ? (
        <ActionButton
          href={action.href}
          icon={action.icon}
          tone="paper"
        >
          {action.label}
        </ActionButton>
      ) : null}
    </div>
  )
}
