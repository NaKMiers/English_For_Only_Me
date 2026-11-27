import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Card, CardContent, CardHeader } from '../ui/card'
import { PageTag } from '../ui/PageTag'

interface Props {
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
  eyebrow?: string
  title?: string
}

export function ContentPanel({
  action,
  children,
  className,
  contentClassName,
  eyebrow,
  title,
}: Props) {
  return (
    <Card
      className={cn(
        'border-line bg-surface text-ink rounded-panel shadow-card relative grid min-w-0 gap-4 border p-5 py-5 ring-0',
        className
      )}
    >
      {eyebrow || title || action ? (
        <CardHeader className="flex! min-w-0 flex-wrap items-start justify-between gap-3 p-0">
          <div className="grid min-w-0 gap-2">
            {eyebrow ? <PageTag tone="pale">{eyebrow}</PageTag> : null}
            {title ? (
              <h2 className="font-sans text-xl leading-tight font-medium tracking-tight wrap-break-word">
                {title}
              </h2>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn('grid gap-4 p-0', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
