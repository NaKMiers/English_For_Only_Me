'use client'

import { Heart, LogOut, Shield } from 'lucide-react'
import Link from 'next/link'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'

interface Props {
  /** The identity chip contents, shared with the static placeholder button. */
  chip: ReactNode
  isAdmin: boolean
  /** Called once mounted, so the placeholder chip can step aside. */
  onMounted: () => void
  signOutAction: () => Promise<void>
  triggerClassName: string
}

/**
 * The interactive half of UserMenu: the base-ui dropdown and the sign-out
 * confirm dialog. Loaded with next/dynamic on the first interaction, so the
 * popup code stays out of every page's initial bundle. It mounts already open,
 * because the click that loaded it was a request to open the menu.
 */
export function UserMenuPopup({
  chip,
  isAdmin,
  onMounted,
  signOutAction,
  triggerClassName,
}: Props) {
  const t = useMessages()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Same commit as the swap, before paint: the placeholder chip that held
  // focus is about to unmount, so move focus onto the real trigger first.
  useLayoutEffect(() => {
    triggerRef.current?.focus()
    onMounted()
  }, [onMounted])

  return (
    <>
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger
          ref={triggerRef}
          className={triggerClassName}
        >
          {chip}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56"
        >
          <DropdownMenuItem render={<Link href="/dictation/favorites" />}>
            <Heart aria-hidden="true" />
            {t.common.auth.favorites}
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <Shield aria-hidden="true" />
              {t.common.auth.admin}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut aria-hidden="true" />
            {t.common.auth.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      >
        <DialogContent className="border-line bg-surface border">
          <DialogHeader>
            <DialogTitle className="font-sans text-xl leading-tight font-semibold tracking-normal">
              {t.common.auth.signOutTitle}
            </DialogTitle>
            <DialogDescription className="text-ink-soft text-base leading-7 font-normal">
              {t.common.auth.signOutDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-tint border-line border-t">
            <DialogClose
              render={
                <ActionButton
                  type="button"
                  tone="paper"
                >
                  {t.common.actions.cancel}
                </ActionButton>
              }
            />
            <form action={signOutAction}>
              <ActionButton
                type="submit"
                icon={
                  <LogOut
                    aria-hidden="true"
                    className="size-5"
                  />
                }
              >
                {t.common.auth.signOut}
              </ActionButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
