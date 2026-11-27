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

const toneClassName = {
  red: 'bg-tint',
  paper: 'bg-surface',
  ink: 'bg-ink text-surface',
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
    'border-line grid min-h-36 min-w-0 gap-3 rounded-panel border p-4',
    href && 'soft-press hover:bg-tint-soft',
    toneClassName[tone],
    className
  )

  const content = (
    <>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-xs leading-tight font-semibold tracking-normal">
          {label}
        </span>
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center">
            {icon}
          </span>
        ) : null}
      </div>
      <strong className="font-sans text-3xl leading-none font-medium tracking-normal wrap-break-word">
        {value}
      </strong>
      <div className="text-sm leading-5 font-semibold wrap-break-word">
        {detail ? <p>{detail}</p> : null}
        {trend ? <p className="text-brand font-semibold">{trend}</p> : null}
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
