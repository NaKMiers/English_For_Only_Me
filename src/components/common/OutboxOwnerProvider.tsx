'use client'

import { createContext, useContext, useMemo } from 'react'

import { getClientOutbox } from '@/lib/sync/clientOutbox'

/**
 * Outside a provider (a component test, or a tree the (app) layout does not
 * wrap) there is no learner; writes then queue under this placeholder, and
 * the server refuses them (409) instead of saving them for whoever is signed
 * in.
 */
const NO_OWNER = ''

const OutboxOwnerContext = createContext<string>(NO_OWNER)

interface Props {
  children: React.ReactNode
  /** The signed-in learner's client owner key (a hash of the user id). */
  ownerKey: string
}

export function OutboxOwnerProvider({ children, ownerKey }: Props) {
  return (
    <OutboxOwnerContext.Provider value={ownerKey}>
      {children}
    </OutboxOwnerContext.Provider>
  )
}

/**
 * The client owner key the server rendered for this learner: a one-way hash,
 * never the raw id.
 */
export function useOutboxOwnerKey() {
  return useContext(OutboxOwnerContext)
}

/** The tab-wide outbox for the current learner. */
export function useClientOutbox() {
  const ownerKey = useContext(OutboxOwnerContext)

  return useMemo(() => getClientOutbox(ownerKey), [ownerKey])
}
