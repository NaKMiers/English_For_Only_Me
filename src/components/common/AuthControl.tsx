import { LogIn } from 'lucide-react'

import { UserMenu } from '@/components/common/UserMenu'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasGoogleAuth } from '@/constants/environments'
import { auth, signIn, signOut } from '@/lib/auth/auth'

/**
 * Topbar auth control. Server component (JWT session read via auth()). Renders a
 * Google sign-in button when signed out, or an identity chip + sign-out when
 * signed in. Renders nothing if Google auth is not configured, so the app still
 * works in a no-auth dev setup.
 */
export async function AuthControl() {
  if (!hasGoogleAuth()) return null

  const session = await auth()
  const user = session?.user

  if (!user)
    return (
      <form
        action={async () => {
          'use server'
          await signIn('google')
        }}
      >
        <MangaButton
          type="submit"
          tone="paper"
          icon={
            <LogIn
              aria-hidden="true"
              className="size-4"
            />
          }
        >
          Sign in
        </MangaButton>
      </form>
    )

  const label = user.name || user.email || 'Account'
  const initial = label.charAt(0).toUpperCase()

  return (
    <UserMenu
      avatarUrl={user.image}
      label={label}
      initial={initial}
      isAdmin={user.role === 'admin'}
      signOutAction={async () => {
        'use server'
        await signOut()
      }}
    />
  )
}
