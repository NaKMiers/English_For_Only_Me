'use client'

import { useMessages } from '@/i18n/client'
import { signOutAction } from '@/lib/auth/actions'

import { useAccount } from './AccountProvider'
import { UserMenu } from './UserMenu'

/**
 * The signed-in learner's account menu. It sits at the foot of the rail on
 * every page (`rail`), and also in the home topbar (`chip`). Every page but
 * the login page has a session, so without one it renders nothing. Reads the
 * session from AccountProvider, so it paints with the page and never blinks
 * between routes.
 */
export function AccountControl({
  variant = 'chip',
}: {
  /** `rail`: the avatar alone, for the rail foot. */
  variant?: 'chip' | 'rail'
}) {
  const t = useMessages()
  const { account } = useAccount()

  if (!account) return null

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
