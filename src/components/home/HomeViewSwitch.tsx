'use client'

import { LayoutDashboard, LayoutList } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import {
  HOME_VIEW_COOKIE,
  HOME_VIEW_COOKIE_MAX_AGE,
  type HomeView,
} from './homeView'

interface Props {
  full: ReactNode
  initialView: HomeView
  labels: {
    full: string
    simple: string
    switchToFull: string
    switchToSimple: string
    title: string
  }
  /** Module links beside the title, shown in both views. */
  nav: ReactNode
  simple: ReactNode
}

/**
 * The dashboard head and body. The title and its icon are the switch (the
 * icon shows the current view and names it on hover): a click flips between
 * the simple and the full dashboard and keeps the choice in a cookie, so the
 * next visit renders the same view on the server with no flash. Both views
 * arrive server-rendered; only the chosen one is mounted.
 */
export function HomeViewSwitch({
  full,
  initialView,
  labels,
  nav,
  simple,
}: Props) {
  const [view, setView] = useState(initialView)
  const isSimple = view === 'simple'
  const Icon = isSimple ? LayoutList : LayoutDashboard

  function toggle() {
    const next: HomeView = isSimple ? 'full' : 'simple'

    setView(next)
    document.cookie = `${HOME_VIEW_COOKIE}=${next}; path=/; max-age=${HOME_VIEW_COOKIE_MAX_AGE}; samesite=lax`
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1
          id="home-title"
          className="font-sans text-4xl font-medium tracking-tight sm:text-5xl"
        >
          <button
            type="button"
            onClick={toggle}
            className="group rounded-control -mx-2 inline-flex items-center gap-4 px-2 py-1 text-left"
          >
            {labels.title}
            {/* Icon only; the view's name unrolls beside it on hover. */}
            <span
              aria-hidden="true"
              className="soft-press border-line bg-surface-muted text-ink group-hover:border-brand/40 group-hover:bg-brand-soft group-hover:text-brand-ink group-focus-visible:bg-brand-soft inline-flex h-12 min-w-12 items-center justify-center rounded-full border px-3 font-sans text-sm font-medium tracking-normal transition-colors"
            >
              <Icon
                key={view}
                className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-75 size-6 shrink-0"
                strokeWidth={1.8}
              />
              <span className="grid max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity,margin] duration-300 ease-out group-hover:ml-2 group-hover:max-w-28 group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-28 group-focus-visible:opacity-100">
                {isSimple ? labels.simple : labels.full}
              </span>
            </span>
            <span className="sr-only">
              {isSimple ? labels.switchToFull : labels.switchToSimple}
            </span>
          </button>
        </h1>
        {nav}
      </div>
      <div
        key={view}
        className="page-enter min-w-0"
      >
        {isSimple ? simple : full}
      </div>
    </>
  )
}
