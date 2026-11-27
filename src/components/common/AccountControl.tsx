'use client'

import { LogIn } from 'lucide-react'

import { ActionButton } from '@/components/ui/ActionButton'
import { IconButton } from '@/components/ui/IconButton'
import { useMessages } from '@/i18n/client'
import { signInAction, signOutAction } from '@/lib/auth/actions'

import { useAccount } from './AccountProvider'
import { UserMenu } from './UserMenu'

/**
 * Account control: a Google sign-in button when signed out, the account menu
 * when signed in, nothing when auth is not configured. It sits at the foot of
 * the rail on every page (`rail`), and also in the home topbar (`chip`). Reads the
 * session from AccountProvider, so it paints with the page and never blinks
 * between routes.
 */
export function AccountControl({
  variant = 'chip',
}: {
  /** `rail`: the avatar alone, or a round sign-in icon, for the rail foot. */
  variant?: 'chip' | 'rail'
}) {
  const t = useMessages()
  const { account, enabled } = useAccount()

  if (!enabled) return null

  if (!account && variant === 'rail')
    return (
      <form action={signInAction}>
        <IconButton
          className="bg-surface-muted size-12"
          label={t.common.auth.signIn}
          type="submit"
        >
          <LogIn
            aria-hidden="true"
            className="size-5"
          />
        </IconButton>
      </form>
    )

  if (!account)
    return (
      <form action={signInAction}>
        <ActionButton
          type="submit"
          tone="paper"
          icon={
            <LogIn
              aria-hidden="true"
              className="size-4"
            />
          }
        >
          {t.common.auth.signIn}
        </ActionButton>
      </form>
    )

  const label = account.firstName || t.common.auth.account
  const menu = (
    <UserMenu
      avatarUrl={account.image}
      label={label}
      initial={account.initial || label.charAt(0).toUpperCase()}
      isAdmin={account.isAdmin}
      signOutAction={signOutAction}
      variant={variant}
    />
  )

  if (variant !== 'rail') return menu

  // In the rail a short rule sets the avatar apart from the toggles above.
  return (
    <>
      <span
        aria-hidden="true"
        className="bg-line-strong h-px w-7 rounded-full"
      />
      {menu}
    </>
  )
}
