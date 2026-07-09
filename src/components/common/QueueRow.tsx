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
        <strong className="font-sans text-base leading-tight font-black wrap-break-word">
          {title}
        </strong>
        {meta ? (
          <span className="text-manga-ink-soft text-sm leading-5 font-semibold wrap-break-word">
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
    'flex min-w-0 items-center justify-between gap-3 border-2 border-manga-black bg-manga-white p-3 shadow-[3px_3px_0_var(--manga-black)]',
    (href || onClick) && 'transition-colors hover:bg-manga-paper-soft',
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
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={event => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          onClick()
        }}
        className={cn(rowClassName, 'cursor-pointer')}
      >
        {content}
      </div>
    )

  return <div className={rowClassName}>{content}</div>
}
