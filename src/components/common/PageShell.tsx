import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { AppCredits } from './AppCredits'
import { AppSidebar } from './AppSidebar'

interface Props {
  children: ReactNode
  className?: string
  footer?: ReactNode
  /**
   * Lock the board to exactly one viewport instead of growing with its
   * content. The page itself then never scrolls - `main` becomes the frame and
   * whatever is rendered inside owns its own scroll regions (see the dictation
   * practice layout). `'lg'` locks it from the lg breakpoint only; smaller
   * screens keep the normal page scroll.
   */
  fullHeight?: boolean | 'lg'
  topbar?: ReactNode
}

/**
 * The app board: one white rounded sheet floating on the lavender backdrop.
 * Grid of two columns - the dark icon rail on the left (md and up) and the
 * page column - with the topbar spanning both, so its logo sits right above
 * the rail. `--rail` is shared with AppTopbar to keep that alignment.
 */
export function PageShell({
  children,
  className,
  footer,
  fullHeight = false,
  topbar,
}: Props) {
  return (
    <div
      className={cn(
        'app-shell bg-board text-ink rounded-shell shadow-shell relative mx-auto grid w-full grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto_auto] [--rail:72px] sm:my-5 sm:w-[min(1480px,calc(100%-40px))] md:grid-cols-[var(--rail)_minmax(0,1fr)] lg:my-8 lg:w-[min(1480px,calc(100%-64px))]',
        fullHeight === true
          ? 'h-dvh sm:h-[calc(100dvh-40px)] lg:h-[calc(100dvh-64px)]'
          : 'min-h-dvh sm:min-h-[calc(100dvh-40px)] lg:min-h-[calc(100dvh-64px)]',
        fullHeight === 'lg' && 'lg:h-[calc(100dvh-64px)] lg:min-h-0',
        className
      )}
    >
      {topbar ? (
        <div className="relative z-10 min-w-0 md:col-span-2">{topbar}</div>
      ) : (
        <div className="hidden md:col-span-2 md:block md:h-6" />
      )}
      <AppSidebar className="hidden md:flex" />
      {/* Each route renders its own shell, so `main` is new on every
          navigation and its entrance replays. Work screens only fade. */}
      <main
        className={cn(
          'relative z-10 min-w-0',
          fullHeight === true ? 'page-enter-quick' : 'page-enter',
          fullHeight === true && 'min-h-0 overflow-hidden',
          fullHeight === 'lg' && 'lg:min-h-0 lg:overflow-hidden'
        )}
      >
        {children}
      </main>
      {footer ? (
        <footer className="relative z-10 min-w-0 md:col-span-2">
          {footer}
        </footer>
      ) : null}
      {/* Work screens locked to one viewport keep every pixel for the task. */}
      {fullHeight === true ? null : (
        <AppCredits
          className={cn('md:col-start-2', fullHeight === 'lg' && 'lg:hidden')}
        />
      )}
    </div>
  )
}
