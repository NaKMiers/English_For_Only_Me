'use client'

import { Menu } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState, type ReactNode } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import type { NavItem } from '@/constants/modules'

interface Props {
  activeHref: string
  /** The topbar's auth slot, repeated in the menu for phones. */
  authControl?: ReactNode
  className?: string
  navItems: NavItem[]
}

const loadTopbarMenuSheet = () => import('./TopbarMenuSheet')

const TopbarMenuSheet = dynamic(
  () => loadTopbarMenuSheet().then(module => module.TopbarMenuSheet),
  { ssr: false }
)

function prefetchSheet() {
  void loadTopbarMenuSheet()
}

/**
 * Hamburger button that replaces the inline topbar nav on narrow screens. The
 * right-side drawer loads on the first click (hover or focus prefetches it), the
 * same way UserMenu keeps its popup off the initial bundle.
 */
export function TopbarMenu({
  activeHref,
  authControl,
  className,
  navItems,
}: Props) {
  const [isActivated, setIsActivated] = useState(false)
  const [open, setOpen] = useState(false)

  function handleOpen() {
    setIsActivated(true)
    setOpen(true)
  }

  return (
    <>
      <IconButton
        label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={prefetchSheet}
        onFocus={prefetchSheet}
        onClick={handleOpen}
        className={className}
      >
        <Menu
          aria-hidden="true"
          className="size-5"
        />
      </IconButton>
      {isActivated && (
        <TopbarMenuSheet
          activeHref={activeHref}
          authControl={authControl}
          navItems={navItems}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  )
}
