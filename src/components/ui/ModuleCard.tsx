import Link from 'next/link'
import type { ReactNode } from 'react'

import type { AppModuleStatus } from '@/constants/modules'
import { cn } from '@/lib/utils'

import { Card, CardContent, CardFooter, CardHeader } from './card'
import { PageTag } from './PageTag'

interface Props {
  className?: string
  cta?: string
  description: string
  href?: string
  icon?: ReactNode
  pageTag?: string
  skill?: string
  status?: AppModuleStatus
  title: string
}

const statusTone: Record<AppModuleStatus, 'red' | 'pale' | 'default'> = {
  active: 'red',
  future: 'pale',
  secondary: 'default',
}

export function ModuleCard({
  className,
  cta = 'Open',
  description,
  href,
  icon,
  pageTag,
  skill,
  status = 'future',
  title,
}: Props) {
  const content = (
    <>
      <CardHeader className="!grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-0">
        <div className="min-w-0">
          {pageTag ? (
            <PageTag tone={statusTone[status]}>{pageTag}</PageTag>
          ) : null}
        </div>
        {icon ? (
          <span className="border-line bg-tint-soft grid size-11 shrink-0 place-items-center border">
            {icon}
          </span>
        ) : null}
        <h3 className="col-span-2 font-sans text-xl leading-none font-semibold tracking-normal wrap-break-word">
          {title}
        </h3>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-ink-soft text-sm leading-6 font-normal wrap-break-word">
          {description}
        </p>
      </CardContent>
      <CardFooter className="border-line/45 mt-auto flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-dashed bg-transparent p-0 pt-3">
        {skill ? (
          <span className="text-xs font-semibold tracking-normal">{skill}</span>
        ) : null}
        <span className="text-brand text-sm font-semibold">{cta}</span>
      </CardFooter>
    </>
  )

  const cardClassName = cn(
    'grid min-h-56 gap-4 rounded-panel border border-line bg-surface p-4 py-4 text-ink ring-0 soft-press',
    href && 'hover:bg-tint',
    className
  )

  if (!href) return <Card className={cardClassName}>{content}</Card>

  return (
    <Link
      href={href}
      className="block min-w-0"
    >
      <Card className={cardClassName}>{content}</Card>
    </Link>
  )
}
