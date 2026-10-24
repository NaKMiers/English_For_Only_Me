'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useCallback, useState, type KeyboardEvent } from 'react'

interface Props {
  avatarUrl?: string | null
  label: string
  initial: string
  isAdmin: boolean
  /** NextAuth signOut() wrapped in a server action, passed from AuthControl. */
  signOutAction: () => Promise<void>
}

const TRIGGER_CLASS_NAME =
  'border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control flex min-h-11 min-w-0 items-center gap-2 border-3 px-2 shadow-[3px_3px_0_var(--manga-black)] transition-colors'

const loadUserMenuPopup = () => import('./UserMenuPopup')

const UserMenuPopup = dynamic(
  () => loadUserMenuPopup().then(module => module.UserMenuPopup),
  { ssr: false }
)

function prefetchPopup() {
  void loadUserMenuPopup()
}

/**
 * Account menu in the topbar. The identity chip renders as a plain button; the
 * dropdown (app shortcuts, the admin console for admins, sign-out) and the
 * sign-out dialog load on the first interaction, keeping the base-ui popup
 * code off every page's initial bundle. Hover or focus prefetches the chunk.
 * The signOut server action is injected so this client file never imports the
 * NextAuth/Mongoose chain into the browser bundle.
 */
export function UserMenu({
  avatarUrl,
  label,
  initial,
  isAdmin,
  signOutAction,
}: Props) {
  const [isActivated, setIsActivated] = useState(false)
  const [isPopupMounted, setIsPopupMounted] = useState(false)
  const handlePopupMounted = useCallback(() => setIsPopupMounted(true), [])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown') return

    event.preventDefault()
    setIsActivated(true)
  }

  const chip = (
    <>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          aria-hidden="true"
          width={28}
          height={28}
          unoptimized
          referrerPolicy="no-referrer"
          className="border-manga-black bg-manga-white rounded-tag size-7 shrink-0 border-2 object-cover"
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
        <span className="truncate font-sans text-sm font-black">{label}</span>
        {isAdmin && (
          <span className="text-manga-ink-soft text-xs font-black uppercase">
            Admin
          </span>
        )}
      </span>
    </>
  )

  return (
    <>
      {/* Stays up while the popup chunk loads, so the chip never blinks. */}
      {!isPopupMounted && (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={false}
          onPointerEnter={prefetchPopup}
          onFocus={prefetchPopup}
          onClick={() => setIsActivated(true)}
          onKeyDown={handleKeyDown}
          className={TRIGGER_CLASS_NAME}
        >
          {chip}
        </button>
      )}
      {isActivated && (
        <UserMenuPopup
          chip={chip}
          isAdmin={isAdmin}
          onMounted={handlePopupMounted}
          signOutAction={signOutAction}
          triggerClassName={TRIGGER_CLASS_NAME}
        />
      )}
    </>
  )
}
