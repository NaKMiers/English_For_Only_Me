'use client'

import { ArrowRight, X } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { NavItem } from '@/constants/modules'

interface Props {
  activeHref: string
  authControl?: ReactNode
  navItems: NavItem[]
  onOpenChange: (open: boolean) => void
  open: boolean
}

/**
 * The right-side navigation drawer for narrow screens, opened by TopbarMenu.
 * Loaded with next/dynamic on the first interaction, so the base-ui dialog
 * code stays out of every page's initial bundle.
 */
export function TopbarMenuSheet({
  activeHref,
  authControl,
  navItems,
  onOpenChange,
  open,
}: Props) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="border-manga-black bg-manga-paper text-manga-black snap-y snap-proximity gap-0 overflow-y-auto border-l-3 shadow-[-6px_0_0_var(--manga-black)] data-[side=right]:w-[min(88vw,380px)] data-[side=right]:sm:max-w-none"
      >
        <SheetHeader className="border-manga-black flex-row items-center justify-between gap-3 border-b-3">
          <div className="grid min-w-0 gap-0.5">
            <SheetTitle className="font-sans text-2xl leading-tight font-black uppercase">
              Menu
            </SheetTitle>
            <SheetDescription className="text-manga-ink-soft font-semibold">
              Jump to a study module.
            </SheetDescription>
          </div>
          <IconButton
            label="Close menu"
            onClick={() => onOpenChange(false)}
          >
            <X
              aria-hidden="true"
              className="size-5"
            />
          </IconButton>
        </SheetHeader>

        <nav
          aria-label="Primary"
          className="mx-auto grid w-full max-w-xl gap-3 p-4"
        >
          {navItems.map(item =>
            item.disabled ? (
              <span
                key={item.href}
                aria-disabled="true"
                className="border-manga-black bg-manga-white text-manga-ink-soft rounded-control flex min-h-14 cursor-not-allowed snap-start items-center justify-between gap-3 border-3 px-4 font-sans text-lg font-black opacity-60 shadow-[4px_4px_0_var(--manga-black)]"
              >
                {item.label}
                <span className="border-manga-black rounded-tag border-2 px-2 py-0.5 text-xs uppercase">
                  Soon
                </span>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === activeHref ? 'page' : undefined}
                onClick={() => onOpenChange(false)}
                className="border-manga-black bg-manga-white hover:bg-manga-paper-soft aria-[current=page]:bg-manga-paper-soft rounded-control flex min-h-14 snap-start items-center justify-between gap-3 border-3 px-4 font-sans text-lg font-black shadow-[4px_4px_0_var(--manga-black)] transition-colors"
              >
                {item.label}
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 shrink-0"
                />
              </Link>
            )
          )}
        </nav>

        {authControl ? (
          <SheetFooter className="mx-auto w-full max-w-xl flex-row sm:hidden">
            {authControl}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
