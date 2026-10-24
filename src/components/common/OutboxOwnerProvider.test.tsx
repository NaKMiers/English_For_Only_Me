import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  OutboxOwnerProvider,
  useClientOutbox,
  useOutboxOwnerKey,
} from './OutboxOwnerProvider'

const { getClientOutbox } = vi.hoisted(() => ({
  getClientOutbox: vi.fn((ownerKey: string | null) => ({ ownerKey })),
}))

vi.mock('@/lib/sync/clientOutbox', () => ({ getClientOutbox }))

function wrapperFor(ownerKey: string | null, isGuest?: boolean) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <OutboxOwnerProvider
        isGuest={isGuest}
        ownerKey={ownerKey}
      >
        {children}
      </OutboxOwnerProvider>
    )
  }
}

describe('OutboxOwnerProvider', () => {
  it('hands the client owner key to hooks below it', () => {
    const { result } = renderHook(() => useOutboxOwnerKey(), {
      wrapper: wrapperFor('guest-hash', true),
    })

    expect(result.current).toBe('guest-hash')
  })

  it('is null outside a provider', () => {
    const { result } = renderHook(() => useOutboxOwnerKey())

    expect(result.current).toBeNull()
  })

  it('asks for the outbox with the owner and whether it is a guest', () => {
    renderHook(() => useClientOutbox(), {
      wrapper: wrapperFor('guest-hash', true),
    })
    expect(getClientOutbox).toHaveBeenLastCalledWith('guest-hash', {
      isGuest: true,
    })

    renderHook(() => useClientOutbox(), { wrapper: wrapperFor('user-hash') })
    expect(getClientOutbox).toHaveBeenLastCalledWith('user-hash', {
      isGuest: false,
    })
  })
})
