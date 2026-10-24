'use client'

import { createContext, useContext, useMemo } from 'react'

import { getClientOutbox } from '@/lib/sync/clientOutbox'

interface OutboxOwner {
  isGuest: boolean
  ownerKey: string | null
}

const OutboxOwnerContext = createContext<OutboxOwner>({
  isGuest: false,
  ownerKey: null,
})

interface Props {
  children: React.ReactNode
  /** True when `ownerKey` belongs to a guest, not a signed-in user. */
  isGuest?: boolean
  ownerKey: string | null
}

export function OutboxOwnerProvider({
  children,
  isGuest = false,
  ownerKey,
}: Props) {
  const value = useMemo(() => ({ isGuest, ownerKey }), [isGuest, ownerKey])

  return (
    <OutboxOwnerContext.Provider value={value}>
      {children}
    </OutboxOwnerContext.Provider>
  )
}

/**
 * The client owner key the server rendered for this learner (a one-way hash,
 * never the raw id), or null for a first-time visitor.
 */
export function useOutboxOwnerKey() {
  return useContext(OutboxOwnerContext).ownerKey
}

/** The tab-wide outbox for the current learner. */
export function useClientOutbox() {
  const { isGuest, ownerKey } = useContext(OutboxOwnerContext)

  return useMemo(
    () => getClientOutbox(ownerKey, { isGuest }),
    [isGuest, ownerKey]
  )
}
