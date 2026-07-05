import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  children: ReactNode
  className?: string
  footer?: ReactNode
  topbar?: ReactNode
}

export function MangaPageShell({ children, className, footer, topbar }: Props) {
  return (
    <div
      className={cn(
        'border-manga-black bg-manga-paper text-manga-black relative mx-auto my-3 min-h-[calc(100vh-24px)] w-[min(1460px,calc(100%-24px))] overflow-hidden border-3 shadow-[8px_8px_0_var(--manga-black),18px_18px_0_var(--manga-shadow)] sm:my-4 sm:min-h-[calc(100vh-32px)] sm:w-[min(1460px,calc(100%-32px))]',
        'before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-[linear-gradient(110deg,transparent_0_18%,rgba(5,5,5,0.045)_18%_18.5%,transparent_18.5%_42%,rgba(224,48,32,0.05)_42%_42.35%,transparent_42.35%),radial-gradient(ellipse_at_84%_8%,rgba(224,48,32,0.13),transparent_28%),radial-gradient(ellipse_at_4%_82%,rgba(5,5,5,0.08),transparent_30%)]',
        'after:border-manga-black/35 after:pointer-events-none after:absolute after:inset-2.5 after:z-0 after:border after:border-dashed',
        className
      )}
    >
      {topbar ? <div className="relative z-10">{topbar}</div> : null}
      <main className="relative z-10 min-w-0">{children}</main>
      {footer ? <footer className="relative z-10">{footer}</footer> : null}
    </div>
  )
}
