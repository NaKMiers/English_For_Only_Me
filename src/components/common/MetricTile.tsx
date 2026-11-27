import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  className?: string
  detail?: string
  href?: string
  icon?: ReactNode
  label: string
  tone?: 'red' | 'paper' | 'ink'
  trend?: string
  value: string
}

/** `paper` is the plain tile; `red` and `ink` are the two highlight tints. */
const toneClassName = {
  red: 'border-transparent bg-pastel-rose',
  paper: 'bg-surface',
  ink: 'border-transparent bg-pastel-lilac',
} as const

export function MetricTile({
  className,
  detail,
  href,
  icon,
  label,
  tone = 'paper',
  trend,
  value,
}: Props) {
  const classNames = cn(
    'border-line grid min-h-28 min-w-0 content-between gap-2 rounded-panel border p-4',
    href && 'soft-press hover-lift hover:bg-tint-soft',
    toneClassName[tone],
    className
  )

  const content = (
    <>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-ink-soft text-xs leading-tight tracking-normal">
          {label}
        </span>
        {icon ? (
          <span className="bg-surface/70 text-ink-soft grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      <strong className="font-sans text-3xl leading-none font-light tracking-tight wrap-break-word tabular-nums">
        {value}
      </strong>
      <div className="text-ink-soft text-xs leading-5 wrap-break-word">
        {detail ? <p>{detail}</p> : null}
        {trend ? <p className="text-brand-ink font-medium">{trend}</p> : null}
      </div>
    </>
  )

  if (href)
    return (
      <Link
        className={classNames}
        href={href}
      >
        {content}
      </Link>
    )

  return <article className={classNames}>{content}</article>
}
