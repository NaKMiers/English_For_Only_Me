'use client'

import { createContext, useContext, type ReactNode } from 'react'

/** What the topbar needs to draw the signed-in learner. */
export interface AccountRecord {
  firstName: string
  image: string | null
  initial: string
  isAdmin: boolean
}

export interface AccountState {
  /** Signed-in learner, or null when signed out. */
  account: AccountRecord | null
  /** False when Google auth is not configured: the control renders nothing. */
  enabled: boolean
}

const AccountContext = createContext<AccountState>({
  account: null,
  enabled: false,
})

/**
 * Holds the session read once by the root layout. The root layout survives
 * every navigation, so each route's topbar (and its loading skeleton) draws
 * the account at once from here instead of waiting on its own session read.
 */
export function AccountProvider({
  children,
  value,
}: {
  children: ReactNode
  value: AccountState
}) {
  return <AccountContext value={value}>{children}</AccountContext>
}

export function useAccount() {
  return useContext(AccountContext)
}
