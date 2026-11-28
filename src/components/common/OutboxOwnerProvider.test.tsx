import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  OutboxOwnerProvider,
  useClientOutbox,
  useOutboxOwnerKey,
} from './OutboxOwnerProvider'

const { getClientOutbox } = vi.hoisted(() => ({
  getClientOutbox: vi.fn((ownerKey: string) => ({ ownerKey })),
}))

vi.mock('@/lib/sync/clientOutbox', () => ({ getClientOutbox }))

function wrapperFor(ownerKey: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <OutboxOwnerProvider ownerKey={ownerKey}>{children}</OutboxOwnerProvider>
    )
  }
}

describe('OutboxOwnerProvider', () => {
  it('hands the client owner key to hooks below it', () => {
    const { result } = renderHook(() => useOutboxOwnerKey(), {
      wrapper: wrapperFor('user-hash'),
    })

    expect(result.current).toBe('user-hash')
  })

  it('is empty outside a provider', () => {
    const { result } = renderHook(() => useOutboxOwnerKey())

    expect(result.current).toBe('')
  })

  it('asks for the outbox of the learner', () => {
    renderHook(() => useClientOutbox(), { wrapper: wrapperFor('user-hash') })

    expect(getClientOutbox).toHaveBeenLastCalledWith('user-hash')
  })
})
