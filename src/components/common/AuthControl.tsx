import { LogIn, LogOut } from 'lucide-react'

import { hasGoogleAuth } from '@/constants/environments'
import { auth, signIn, signOut } from '@/lib/auth/auth'
import { cn } from '@/lib/utils'

const buttonClass = cn(
  'border-manga-black bg-manga-white hover:bg-manga-paper-soft inline-flex min-h-11 shrink-0 items-center gap-2 border-3 px-3 font-sans text-sm font-black whitespace-nowrap shadow-[3px_3px_0_var(--manga-black)] transition-colors'
)

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
        <button
          type="submit"
          className={buttonClass}
        >
          <LogIn
            aria-hidden="true"
            className="size-4"
          />
          Sign in
        </button>
      </form>
    )

  const label = user.name || user.email || 'Account'
  const initial = label.charAt(0).toUpperCase()

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="border-manga-black bg-manga-white flex min-h-11 min-w-0 items-center gap-2 border-3 px-2 shadow-[3px_3px_0_var(--manga-black)]">
        <span
          aria-hidden="true"
          className="bg-manga-black text-manga-white grid size-7 shrink-0 place-items-center font-sans text-sm font-black"
        >
          {initial}
        </span>
        <span className="grid min-w-0 leading-tight">
          <span className="truncate font-sans text-sm font-black">{label}</span>
          {user.role === 'admin' && (
            <span className="text-manga-ink-soft text-xs font-black uppercase">
              Admin
            </span>
          )}
        </span>
      </span>
      <form
        action={async () => {
          'use server'
          await signOut()
        }}
      >
        <button
          type="submit"
          aria-label="Sign out"
          className={buttonClass}
        >
          <LogOut
            aria-hidden="true"
            className="size-4"
          />
        </button>
      </form>
    </div>
  )
}
