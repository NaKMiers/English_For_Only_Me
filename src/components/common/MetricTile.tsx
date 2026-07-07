import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  className?: string
  detail?: string
  icon?: ReactNode
  label: string
  tone?: 'red' | 'paper' | 'ink'
  trend?: string
  value: string
}

const toneClassName = {
  red: 'bg-manga-paper-soft',
  paper: 'bg-manga-white',
  ink: 'bg-manga-black text-manga-white',
} as const

export function MetricTile({
  className,
  detail,
  icon,
  label,
  tone = 'paper',
  trend,
  value,
}: Props) {
  return (
    <article
      className={cn(
        'border-manga-black grid min-h-36 min-w-0 gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]',
        toneClassName[tone],
        className
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-xs leading-tight font-black tracking-normal uppercase">
          {label}
        </span>
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center">
            {icon}
          </span>
        ) : null}
      </div>
      <strong className="font-sans text-3xl leading-none font-black tracking-normal wrap-break-word">
        {value}
      </strong>
      <div className="text-sm leading-5 font-semibold wrap-break-word">
        {detail ? <p>{detail}</p> : null}
        {trend ? <p className="text-manga-red font-black">{trend}</p> : null}
      </div>
    </article>
  )
}
