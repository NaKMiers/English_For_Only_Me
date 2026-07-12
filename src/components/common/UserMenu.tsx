'use client'

import { ChartColumn, LogOut, Shield } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

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
  avatarUrl?: string | null
  label: string
  initial: string
  isAdmin: boolean
  /** NextAuth signOut() wrapped in a server action, passed from AuthControl. */
  signOutAction: () => Promise<void>
}

/**
 * Account menu in the topbar. The identity chip is the dropdown trigger; the
 * menu holds app shortcuts, the admin console (admins only), and sign-out.
 * Built on the shared shadcn DropdownMenu + Dialog primitives. The signOut
 * server action is injected so this client file never imports the
 * NextAuth/Mongoose chain into the browser bundle.
 */
export function UserMenu({
  avatarUrl,
  label,
  initial,
  isAdmin,
  signOutAction,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="border-manga-black bg-manga-white hover:bg-manga-paper-soft flex min-h-11 min-w-0 items-center gap-2 border-3 px-2 shadow-[3px_3px_0_var(--manga-black)] transition-colors">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              aria-hidden="true"
              width={28}
              height={28}
              unoptimized
              referrerPolicy="no-referrer"
              className="border-manga-black bg-manga-white size-7 shrink-0 border-2 object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="bg-manga-black text-manga-white grid size-7 shrink-0 place-items-center font-sans text-sm font-black"
            >
              {initial}
            </span>
          )}
          <span className="grid min-w-0 leading-tight">
            <span className="truncate font-sans text-sm font-black">
              {label}
            </span>
            {isAdmin && (
              <span className="text-manga-ink-soft text-xs font-black uppercase">
                Admin
              </span>
            )}
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-56"
        >
          <DropdownMenuItem render={<Link href="/dictation/stats" />}>
            <ChartColumn aria-hidden="true" />
            Stats
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
        <DialogContent className="border-manga-black bg-manga-white rounded-none border-3 shadow-[6px_6px_0_var(--manga-black)]">
          <DialogHeader>
            <DialogTitle className="font-sans text-xl leading-tight font-black tracking-normal uppercase">
              Sign out?
            </DialogTitle>
            <DialogDescription className="text-manga-ink-soft text-base leading-7 font-semibold">
              You will be signed out of English For Only Me.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-manga-paper-soft border-manga-black rounded-none border-t-3">
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
