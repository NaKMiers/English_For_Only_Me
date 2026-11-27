'use client'

import { House } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { navItemLabel, PRIMARY_NAV_ITEMS } from '@/constants/modules'
import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'

import { isActiveHref, NAV_ICONS } from './AppSidebar'

interface Props {
  className?: string
}

/**
 * Phone navigation: the dark rail turned into a floating pill at the bottom
 * of the screen, one tap per module. PageShell renders it below `md` on
 * normal pages and leaves it out on full-height work screens; the IELTS
 * runner paints over it.
 */
export function AppTabBar({ className }: Props) {
  const t = useMessages()
  const pathname = usePathname() ?? '/'
  const items = PRIMARY_NAV_ITEMS.filter(item => !item.disabled)

  return (
    <nav
      aria-label={t.common.nav.primary}
      className={cn(
        'bg-rail fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 mx-auto grid h-16 max-w-md auto-cols-fr grid-flow-col items-center gap-1 rounded-full p-1.5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)]',
        className
      )}
    >
      {items.map(item => {
        const Icon = NAV_ICONS[item.href] ?? House
        const active = isActiveHref(pathname, item.href)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'soft-press text-rail-fg/60 grid h-full min-w-0 place-items-center content-center gap-0.5 rounded-full px-1',
              active && 'bg-rail-fg/15 text-rail-fg'
            )}
          >
            <Icon
              aria-hidden="true"
              className="size-5"
            />
            <span className="max-w-full truncate text-[10px] leading-tight font-medium">
              {navItemLabel(item, t)}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
