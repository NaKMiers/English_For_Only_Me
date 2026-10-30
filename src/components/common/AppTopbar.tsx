import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { TopbarMenu } from '@/components/common/TopbarMenu'
import { PRIMARY_NAV_ITEMS, type NavItem } from '@/constants/modules'
import { cn } from '@/lib/utils'

interface Props {
  activeHref?: string
  className?: string
  /**
   * One slim row (smaller logo, title and controls) for work screens that
   * need the height, like the IELTS test editor.
   */
  compact?: boolean
  navItems?: NavItem[]
  subtitle?: string
  title?: string
  /**
   * Optional auth control slot (injected as <AuthControl /> by server pages).
   * Kept as a slot so AppTopbar stays client-safe: it must NOT statically import
   * the NextAuth/Mongoose chain, or client boundaries (error.tsx) that render
   * the topbar would drag server-only code into the browser bundle.
   */
  authControl?: ReactNode
}

export function AppTopbar({
  activeHref = '/',
  className,
  compact = false,
  navItems = PRIMARY_NAV_ITEMS,
  subtitle = 'Personal IELTS manga desk',
  title = 'English For Only Me',
  authControl,
}: Props) {
  return (
    <header
      className={cn(
        'border-manga-black bg-manga-white/88 grid grid-cols-[minmax(0,1fr)_auto] items-center border-b-3 xl:grid-cols-[minmax(240px,1fr)_auto_auto]',
        compact ? 'gap-3 px-4 py-2' : 'min-h-21 gap-4 p-4',
        className
      )}
    >
      <Link
        href="/"
        className={cn(
          'text-manga-black grid min-w-0 items-center',
          compact
            ? 'grid-cols-[36px_1fr] gap-2.5'
            : 'grid-cols-[54px_1fr] gap-3'
        )}
      >
        <Image
          src="/logo.png"
          alt="English For Only Me logo"
          width={58}
          height={58}
          priority
          className={cn(
            'border-manga-black bg-manga-white rounded-control object-contain',
            compact
              ? 'size-9 border-2 shadow-[2px_2px_0_var(--manga-black)]'
              : 'size-14 border-3 shadow-[4px_4px_0_var(--manga-black)]'
          )}
        />
        <span className={cn('grid min-w-0', compact ? 'gap-0.5' : 'gap-1')}>
          <strong
            className={cn(
              'font-sans leading-tight font-black tracking-normal text-balance uppercase',
              compact
                ? 'truncate text-sm sm:text-base'
                : 'text-[clamp(1.05rem,3.5vw,1.5rem)] sm:text-[clamp(1.1rem,1.8vw,1.6rem)]'
            )}
          >
            {title}
          </strong>
          <span
            className={cn(
              'text-manga-ink-soft truncate text-xs leading-tight font-black',
              !compact && 'sm:text-sm'
            )}
          >
            {subtitle}
          </span>
        </span>
      </Link>

      <nav
        aria-label="Primary"
        className={cn(
          'hidden min-w-0 snap-x snap-proximity items-center gap-2 overflow-x-auto pb-1 xl:flex',
          // Slimmer chips: thinner border and shadow, smaller type.
          compact &&
            'gap-1.5 *:min-h-9 *:border-2 *:px-2.5 *:text-xs *:shadow-[2px_2px_0_var(--manga-black)]'
        )}
      >
        {navItems.map(item =>
          item.disabled ? (
            <span
              key={item.href}
              aria-disabled="true"
              title="Coming soon"
              className="border-manga-black bg-manga-white/70 text-manga-ink-soft rounded-control inline-flex min-h-11 shrink-0 cursor-not-allowed snap-start items-center border-3 px-3 font-sans text-sm font-black whitespace-nowrap opacity-70 shadow-[3px_3px_0_var(--manga-black)]"
            >
              {item.label}
            </span>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === activeHref ? 'page' : undefined}
              className="border-manga-black bg-manga-white hover:bg-manga-paper-soft aria-[current=page]:bg-manga-paper-soft rounded-control inline-flex min-h-11 shrink-0 snap-start items-center border-3 px-3 font-sans text-sm font-black whitespace-nowrap shadow-[3px_3px_0_var(--manga-black)] transition-colors"
            >
              {item.label}
            </Link>
          )
        )}
      </nav>

      <div className="flex min-w-0 items-center justify-end gap-2">
        {/* On phones the account control lives in the menu instead. */}
        <div
          className={cn(
            'hidden min-w-0 sm:flex',
            compact &&
              '[&_button]:min-h-9 [&_button]:border-2 [&_button]:shadow-[2px_2px_0_var(--manga-black)]'
          )}
        >
          {authControl}
        </div>
        {/* Below xl the inline nav would overflow, so it moves into a menu. */}
        <TopbarMenu
          activeHref={activeHref}
          authControl={authControl}
          navItems={navItems}
          className={cn(
            'xl:hidden',
            compact && 'size-9 border-2 shadow-[2px_2px_0_var(--manga-black)]'
          )}
        />
      </div>
    </header>
  )
}
