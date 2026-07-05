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
      <CardHeader className="!grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-none p-0">
        <div className="min-w-0">
          {pageTag ? (
            <PageTag tone={statusTone[status]}>{pageTag}</PageTag>
          ) : null}
        </div>
        {icon ? (
          <span className="border-manga-black bg-manga-pale-red grid size-11 shrink-0 place-items-center border-2 shadow-[3px_3px_0_var(--manga-black)]">
            {icon}
          </span>
        ) : null}
        <h3 className="col-span-2 font-sans text-xl leading-none font-black tracking-normal break-words uppercase">
          {title}
        </h3>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-manga-ink-soft text-sm leading-6 font-semibold break-words">
          {description}
        </p>
      </CardContent>
      <CardFooter className="border-manga-black/45 mt-auto flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-none border-t-2 border-dashed bg-transparent p-0 pt-3">
        {skill ? (
          <span className="text-xs font-black tracking-normal uppercase">
            {skill}
          </span>
        ) : null}
        <span className="text-manga-red text-sm font-black">{cta}</span>
      </CardFooter>
    </>
  )

  const cardClassName = cn(
    'grid min-h-56 gap-4 rounded-none border-3 border-manga-black bg-manga-white p-4 py-4 text-manga-black shadow-[4px_4px_0_var(--manga-black)] ring-0 transition-[background,box-shadow,transform] duration-150',
    href &&
      'hover:bg-manga-paper-soft active:translate-x-1 active:translate-y-1 active:shadow-none',
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
