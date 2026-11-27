'use client'

import {
  BookA,
  GraduationCap,
  Headphones,
  House,
  PenLine,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { PRIMARY_NAV_ITEMS } from '@/constants/modules'
import { cn } from '@/lib/utils'

import { ThemeToggle } from './ThemeToggle'

const NAV_ICONS: Record<string, LucideIcon> = {
  '/': House,
  '/dictation': Headphones,
  '/vocabulary': BookA,
  '/grammar': PenLine,
  '/ielts': GraduationCap,
}

/** `/` only matches itself; a module matches its whole subtree. */
export function isActiveHref(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface Props {
  className?: string
}

/**
 * The dark icon rail on the left of the board: one pill holding the module
 * links (the current one sits in a lighter circle), and the day / night
 * toggle under it. Phones get the same links from the topbar menu instead.
 */
export function AppSidebar({ className }: Props) {
  const pathname = usePathname() ?? '/'
  const items = PRIMARY_NAV_ITEMS.filter(item => !item.disabled)

  return (
    <aside
      className={cn(
        'sticky top-6 flex-col items-center gap-4 self-start pt-2 pb-6',
        className
      )}
    >
      <nav
        aria-label="Primary"
        className="bg-rail flex w-14 flex-col items-center gap-2 rounded-full p-1.5"
      >
        {items.map(item => {
          const Icon = NAV_ICONS[item.href] ?? House
          const active = isActiveHref(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'soft-press text-rail-fg/55 hover:text-rail-fg grid size-11 place-items-center rounded-full',
                active && 'bg-rail-fg/15 text-rail-fg'
              )}
            >
              <Icon
                aria-hidden="true"
                className="size-5"
              />
            </Link>
          )
        })}
      </nav>
      <ThemeToggle />
    </aside>
  )
}
