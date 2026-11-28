import Link from 'next/link'
import type { ReactNode } from 'react'

import type { PAGE_TAG_TONES } from '@/constants/theme'
import { cn } from '@/lib/utils'

import { PageTag } from '../ui/PageTag'

interface Props {
  action?: ReactNode
  className?: string
  href?: string
  meta?: string
  onClick?: () => void
  status?: string
  statusTone?: keyof typeof PAGE_TAG_TONES
  title: string
}

export function QueueRow({
  action,
  className,
  href,
  meta,
  onClick,
  status,
  statusTone = 'pale',
  title,
}: Props) {
  const content = (
    <>
      <div className="grid min-w-0 gap-1">
        <strong className="font-sans text-base leading-tight font-medium wrap-break-word">
          {title}
        </strong>
        {meta ? (
          <span className="text-ink-soft text-sm leading-5 font-normal wrap-break-word">
            {meta}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status ? <PageTag tone={statusTone}>{status}</PageTag> : null}
        {action}
      </div>
    </>
  )

  const rowClassName = cn(
    'flex min-w-0 items-center justify-between gap-3 rounded-control border border-line bg-surface p-3',
    (href || onClick) && 'soft-press hover-pop hover:bg-tint text-left',
    className
  )

  if (href)
    return (
      <Link
        href={href}
        className={rowClassName}
      >
        {content}
      </Link>
    )

  if (onClick)
    return (
      <button
        className={cn(rowClassName, 'w-full')}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    )

  return <div className={rowClassName}>{content}</div>
}
