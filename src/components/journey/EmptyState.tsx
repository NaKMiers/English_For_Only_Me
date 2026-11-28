import type { ReactNode } from 'react'

import { ActionButton } from '@/components/ui/ActionButton'
import { cn } from '@/lib/utils'

interface Props {
  /**
   * The one next useful action. `ink` when it is the page's main way on
   * (nothing else on the page competes), `paper` by default.
   */
  action?: {
    href: string
    icon?: ReactNode
    label: string
    tone?: 'ink' | 'paper'
  }
  body?: ReactNode
  className?: string
  /** A rendered icon or the buddy mascot. */
  icon?: ReactNode
  /** A picture of the thing (a video thumbnail), shown instead of the icon. */
  media?: ReactNode
  title: string
}

/**
 * An empty list or queue: what the state means and the one next useful
 * action, never a bare paragraph.
 */
export function EmptyState({
  action,
  body,
  className,
  icon,
  media,
  title,
}: Props) {
  return (
    <div
      className={cn(
        'border-line bg-surface rounded-panel grid justify-items-center gap-3 border border-dashed p-6 text-center',
        className
      )}
      data-empty-state=""
    >
      {media ? (
        <div className="w-full max-w-56">{media}</div>
      ) : icon ? (
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
          data-next-stop={action.tone === 'ink' ? '' : undefined}
          icon={action.icon}
          tone={action.tone ?? 'paper'}
        >
          {action.label}
        </ActionButton>
      ) : null}
    </div>
  )
}
