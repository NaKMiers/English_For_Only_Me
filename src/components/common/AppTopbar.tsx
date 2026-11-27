'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { TopbarMenu } from '@/components/common/TopbarMenu'
import { PRIMARY_NAV_ITEMS, type NavItem } from '@/constants/modules'
import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'

import { AccountControl } from './AccountControl'
import { ThemeToggle } from './ThemeToggle'

interface Props {
  activeHref?: string
  /**
   * Page content for the right end of the row (md and up), where the home
   * page keeps the account chip. The IELTS page puts its heading here.
   */
  aside?: ReactNode
  className?: string
  /**
   * One slim row (smaller logo and title) for work screens that need the
   * height, like the IELTS test editor.
   */
  compact?: boolean
  /** Links for the phone menu. The rail (AppSidebar) carries them from md. */
  navItems?: NavItem[]
  /** The account chip on the right (home only; the rail always has it). */
  showAccount?: boolean
  subtitle?: string
  title?: string
}

/**
 * The board's top row: the logo above the icon rail, a greeting-style title,
 * and an optional `aside` on the right. The account avatar sits at the foot
 * of the rail on every page; only the home page repeats it here as a chip
 * (`showAccount`). On phones, where there is no rail, the account lives in
 * the menu. The account comes from the root layout's AccountProvider, so it
 * never blinks during navigation.
 */
export function AppTopbar({
  activeHref = '/',
  aside,
  className,
  compact = false,
  navItems = PRIMARY_NAV_ITEMS,
  showAccount = false,
  subtitle,
  title,
}: Props) {
  const t = useMessages()

  return (
    <header
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[var(--rail)_minmax(0,1fr)_auto] md:gap-0',
        compact ? 'px-4 py-2 md:px-0' : 'px-4 py-4 md:px-0 md:py-6',
        className
      )}
    >
      <Link
        href="/"
        className="text-ink col-span-1 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 md:col-span-2 md:grid-cols-[var(--rail)_minmax(0,1fr)] md:gap-0"
      >
        <Image
          src="/logo.png"
          alt={t.common.app.logoAlt}
          width={56}
          height={56}
          priority
          className={cn(
            'rounded-2xl object-contain md:justify-self-center',
            compact ? 'size-9' : 'size-12'
          )}
        />
        <span className="grid min-w-0 gap-0.5">
          <strong
            className={cn(
              'truncate font-sans leading-tight font-medium tracking-tight',
              compact ? 'text-base' : 'text-xl sm:text-2xl'
            )}
          >
            {title ?? t.common.app.name}
          </strong>
          <span className="text-ink-soft truncate text-sm leading-tight">
            {subtitle ?? t.common.app.tagline}
          </span>
        </span>
      </Link>

      <div className="flex min-w-0 items-center justify-end gap-2 md:pr-6">
        {aside ? <div className="hidden min-w-0 md:flex">{aside}</div> : null}
        {/* On phones the account control lives in the menu instead. */}
        {showAccount ? (
          <div className="hidden min-w-0 sm:flex">
            <AccountControl />
          </div>
        ) : null}
        <ThemeToggle className="size-11 md:hidden" />
        <TopbarMenu
          activeHref={activeHref}
          authControl={<AccountControl />}
          navItems={navItems}
          className="md:hidden"
        />
      </div>
    </header>
  )
}
