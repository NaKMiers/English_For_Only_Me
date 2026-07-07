import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Card, CardContent, CardHeader } from '../ui/card'
import { PageTag } from '../ui/PageTag'

interface Props {
  action?: ReactNode
  children: ReactNode
  className?: string
  eyebrow?: string
  title?: string
}

export function MangaPanel({
  action,
  children,
  className,
  eyebrow,
  title,
}: Props) {
  return (
    <Card
      className={cn(
        'border-manga-black bg-manga-white text-manga-black relative grid min-w-0 gap-4 rounded-none border-3 p-4 py-4 shadow-[4px_4px_0_var(--manga-black)] ring-0',
        className
      )}
    >
      {eyebrow || title || action ? (
        <CardHeader className="flex! min-w-0 flex-wrap items-start justify-between gap-3 rounded-none p-0">
          <div className="grid min-w-0 gap-2">
            {eyebrow ? <PageTag tone="pale">{eyebrow}</PageTag> : null}
            {title ? (
              <h2 className="font-sans text-2xl leading-none font-black tracking-normal wrap-break-word uppercase">
                {title}
              </h2>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className="grid gap-4 p-0">{children}</CardContent>
    </Card>
  )
}
