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
import { navItemLabel, type NavItem } from '@/constants/modules'
import { useMessages } from '@/i18n/client'

import { LocaleToggle } from './LocaleToggle'

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
  const t = useMessages()

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="border-line bg-surface text-ink snap-y snap-proximity gap-0 overflow-y-auto border-l data-[side=right]:w-[min(88vw,380px)] data-[side=right]:sm:max-w-none"
      >
        <SheetHeader className="border-line flex-row items-center justify-between gap-3 border-b">
          <div className="grid min-w-0 gap-0.5">
            <SheetTitle className="font-sans text-2xl leading-tight font-semibold">
              {t.common.nav.menu}
            </SheetTitle>
            <SheetDescription className="text-ink-soft font-normal">
              {t.common.nav.menuDescription}
            </SheetDescription>
          </div>
          <IconButton
            label={t.common.nav.closeMenu}
            onClick={() => onOpenChange(false)}
          >
            <X
              aria-hidden="true"
              className="size-5"
            />
          </IconButton>
        </SheetHeader>

        <nav
          aria-label={t.common.nav.primary}
          className="mx-auto grid w-full max-w-xl gap-3 p-4"
        >
          {navItems.map(item =>
            item.disabled ? (
              <span
                key={item.href}
                aria-disabled="true"
                className="border-line bg-surface text-ink-soft rounded-control flex min-h-14 cursor-not-allowed snap-start items-center justify-between gap-3 border px-4 font-sans text-lg font-normal opacity-60"
              >
                {navItemLabel(item, t)}
                <span className="border-line rounded-tag border px-2 py-0.5 text-xs">
                  {t.common.nav.soon}
                </span>
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === activeHref ? 'page' : undefined}
                onClick={() => onOpenChange(false)}
                className="border-line bg-surface hover:bg-tint aria-[current=page]:bg-tint rounded-control flex min-h-14 snap-start items-center justify-between gap-3 border px-4 font-sans text-lg font-semibold transition-colors"
              >
                {navItemLabel(item, t)}
                <ArrowRight
                  aria-hidden="true"
                  className="size-5 shrink-0"
                />
              </Link>
            )
          )}
        </nav>

        {/* The rail holds the language pill from md; phones get it here. */}
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 pb-4">
          <span className="text-ink-soft text-sm">
            {t.common.language.label}
          </span>
          <LocaleToggle className="w-24" />
        </div>

        {authControl ? (
          <SheetFooter className="mx-auto w-full max-w-xl flex-row sm:hidden">
            {authControl}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
