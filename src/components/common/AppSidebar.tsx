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
import { useLayoutEffect, useRef } from 'react'

import { PRIMARY_NAV_ITEMS } from '@/constants/modules'
import { cn } from '@/lib/utils'

import { ThemeToggle } from './ThemeToggle'

/** Icon per primary route, shared by the rail and the phone tab bar. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  '/': House,
  '/dictation': Headphones,
  '/vocabulary': BookA,
  '/grammar': PenLine,
  '/ielts': GraduationCap,
}

// The active pill slides between icons. Every route renders its own shell,
// so the rail remounts on navigation: the last active index lives at module
// scope, and a new rail continues the slide from where the old one was (a
// negative delay picks up mid-flight when a loading skeleton swapped in).
// Step = link size (44px, size-11) + gap (8px, gap-2).
const RAIL_STEP = 52
const RAIL_SLIDE_MS = 380
const RAIL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const railMemory = { from: -1, index: -1, startedAt: 0 }

function railOffset(index: number) {
  return `translateY(${index * RAIL_STEP}px)`
}

function useRailSlide(activeIndex: number) {
  const pillRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const now = performance.now()
    if (railMemory.index !== activeIndex) {
      railMemory.from = railMemory.index
      railMemory.index = activeIndex
      railMemory.startedAt = now
    }
    const pill = pillRef.current
    const elapsed = now - railMemory.startedAt
    if (
      !pill ||
      railMemory.from < 0 ||
      activeIndex < 0 ||
      elapsed >= RAIL_SLIDE_MS ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const slide = pill.animate(
      [
        { transform: railOffset(railMemory.from) },
        { transform: railOffset(activeIndex) },
      ],
      { delay: -elapsed, duration: RAIL_SLIDE_MS, easing: RAIL_EASE }
    )
    return () => slide.cancel()
  }, [activeIndex])

  return pillRef
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
  const activeIndex = items.findIndex(item => isActiveHref(pathname, item.href))
  const pillRef = useRailSlide(activeIndex)

  return (
    <aside
      className={cn(
        'sticky top-6 flex-col items-center gap-4 self-start pt-2 pb-6',
        className
      )}
    >
      <nav
        aria-label="Primary"
        className="bg-rail relative flex w-14 flex-col items-center gap-2 rounded-full p-1.5"
      >
        {activeIndex >= 0 ? (
          <span
            ref={pillRef}
            aria-hidden="true"
            className="bg-rail-fg/15 pointer-events-none absolute top-1.5 left-1.5 size-11 rounded-full"
            style={{ transform: railOffset(activeIndex) }}
          />
        ) : null}
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
                'soft-press text-rail-fg/55 hover:text-rail-fg relative grid size-11 place-items-center rounded-full',
                active && 'text-rail-fg'
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
