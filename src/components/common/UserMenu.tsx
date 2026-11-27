'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useCallback, useState, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  avatarUrl?: string | null
  label: string
  initial: string
  isAdmin: boolean
  /** NextAuth signOut() wrapped in a server action, passed from AccountControl. */
  signOutAction: () => Promise<void>
  /**
   * `chip`: avatar and first name (the home topbar). `rail`: the avatar
   * alone, the size of the rail's toggles, with the menu opening sideways.
   */
  variant?: 'chip' | 'rail'
}

const TRIGGER_CLASS_NAMES = {
  chip: 'soft-press hover-pop border-line bg-surface-muted hover:bg-tint rounded-control flex min-h-11 min-w-0 items-center gap-2.5 border py-1 pr-3 pl-1',
  // A squircle in a brand gradient ring: unlike the round, grey toggles
  // above it, it reads as "you", not as a setting.
  rail: 'soft-press hover-pop from-brand via-accent-pink to-accent-orange grid size-12 place-items-center rounded-[18px] bg-linear-135 p-[2.5px] shadow-sm',
} as const

const loadUserMenuPopup = () => import('./UserMenuPopup')

const UserMenuPopup = dynamic(
  () => loadUserMenuPopup().then(module => module.UserMenuPopup),
  { ssr: false }
)

function prefetchPopup() {
  void loadUserMenuPopup()
}

/**
 * Account menu: a chip in the home topbar, the avatar alone at the foot of
 * the rail. The identity chip renders as a plain button; the
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
  variant = 'chip',
}: Props) {
  const triggerClassName = TRIGGER_CLASS_NAMES[variant]
  const rail = variant === 'rail'
  const [isActivated, setIsActivated] = useState(false)
  const [isPopupMounted, setIsPopupMounted] = useState(false)
  const handlePopupMounted = useCallback(() => setIsPopupMounted(true), [])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowDown') return

    event.preventDefault()
    setIsActivated(true)
  }

  // A rounded-square avatar and the first name: the role lives in the menu.
  const chip = (
    <>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          aria-hidden="true"
          width={36}
          height={36}
          unoptimized
          referrerPolicy="no-referrer"
          className={cn(
            'bg-surface shrink-0 object-cover',
            rail
              ? 'border-board size-full rounded-[15px] border-2'
              : 'border-line rounded-control size-9 border'
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'bg-brand-soft text-brand-ink grid shrink-0 place-items-center font-sans text-sm font-semibold',
            rail
              ? 'border-board size-full rounded-[15px] border-2'
              : 'rounded-control size-9'
          )}
        >
          {initial}
        </span>
      )}
      <span
        className={
          rail ? 'sr-only' : 'max-w-32 truncate font-sans text-sm font-medium'
        }
      >
        {label}
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
          className={triggerClassName}
        >
          {chip}
        </button>
      )}
      {isActivated && (
        <UserMenuPopup
          chip={chip}
          isAdmin={isAdmin}
          onMounted={handlePopupMounted}
          side={rail ? 'right' : 'bottom'}
          signOutAction={signOutAction}
          triggerClassName={triggerClassName}
        />
      )}
    </>
  )
}
