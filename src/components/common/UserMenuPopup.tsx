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
import { MangaButton } from '@/components/ui/MangaButton'

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
            Favorites
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <Shield aria-hidden="true" />
              Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
      >
        <DialogContent className="border-manga-black bg-manga-white border-3 shadow-[6px_6px_0_var(--manga-black)]">
          <DialogHeader>
            <DialogTitle className="font-sans text-xl leading-tight font-black tracking-normal uppercase">
              Sign out?
            </DialogTitle>
            <DialogDescription className="text-manga-ink-soft text-base leading-7 font-semibold">
              You will be signed out of English For Only Me.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-manga-paper-soft border-manga-black border-t-3">
            <DialogClose
              render={
                <MangaButton
                  type="button"
                  tone="paper"
                >
                  Cancel
                </MangaButton>
              }
            />
            <form action={signOutAction}>
              <MangaButton
                type="submit"
                icon={
                  <LogOut
                    aria-hidden="true"
                    className="size-5"
                  />
                }
              >
                Sign out
              </MangaButton>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
