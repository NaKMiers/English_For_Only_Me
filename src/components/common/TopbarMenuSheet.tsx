'use client'

import { X } from 'lucide-react'
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
import { useMessages } from '@/i18n/client'

import { LocaleToggle } from './LocaleToggle'

interface Props {
  authControl?: ReactNode
  onOpenChange: (open: boolean) => void
  open: boolean
}

/**
 * The right-side account sheet for narrow screens, opened by TopbarMenu.
 * Loaded with next/dynamic on the first interaction, so the base-ui dialog
 * code stays out of every page's initial bundle.
 */
export function TopbarMenuSheet({ authControl, onOpenChange, open }: Props) {
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
            <SheetTitle className="font-sans text-2xl leading-tight font-medium">
              {t.common.nav.accountMenu}
            </SheetTitle>
            <SheetDescription className="text-ink-soft font-normal">
              {t.common.nav.accountMenuDescription}
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

        {/* Modules live in the phone tab bar; this sheet is the account:
            who is signed in, then the language. */}
        {/* The rail holds the language pill from md; phones get it here. */}
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-4">
          <span className="text-ink-soft text-sm">
            {t.common.language.label}
          </span>
          <LocaleToggle />
        </div>

        {authControl ? (
          <SheetFooter className="mx-auto w-full max-w-xl flex-row">
            {authControl}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
