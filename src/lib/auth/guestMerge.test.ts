import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  clearGuestCookie: vi.fn(),
  getGuestId: vi.fn(),
  getGuestMergeOwner: vi.fn(),
  mergeDictation: vi.fn(),
  mergeGrammar: vi.fn(),
  mergeIelts: vi.fn(),
  setGuestMergeOwner: vi.fn(),
}))

vi.mock('./guestUser', () => ({
  clearGuestCookie: mocks.clearGuestCookie,
  getGuestId: mocks.getGuestId,
  getGuestMergeOwner: mocks.getGuestMergeOwner,
  setGuestMergeOwner: mocks.setGuestMergeOwner,
}))
vi.mock('@/modules/dictation/services/mergeGuestData', () => ({
  mergeGuestDataIntoUser: mocks.mergeDictation,
}))
vi.mock('@/modules/grammar/services/mergeGrammarGuestData', () => ({
  mergeGrammarGuestData: mocks.mergeGrammar,
}))
vi.mock('@/modules/ielts/services/mergeIeltsGuestData', () => ({
  mergeIeltsGuestData: mocks.mergeIelts,
}))

import { foldGuestIntoUser, guestMergeStep } from './guestMerge'

const GUEST = 'guest_1'

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.getGuestId.mockResolvedValue(GUEST)
  mocks.getGuestMergeOwner.mockResolvedValue(null)
})

describe('guestMergeStep', () => {
  it('merges a guest into whoever signs in when nothing is pending', () => {
    expect(
      guestMergeStep({ guestId: GUEST, pendingFor: null, userId: 'B' })
    ).toBe('merge')
  })

  it('retries an unfinished merge only for the account it was for', () => {
    expect(
      guestMergeStep({ guestId: GUEST, pendingFor: 'A', userId: 'A' })
    ).toBe('merge')
    expect(
      guestMergeStep({ guestId: GUEST, pendingFor: 'A', userId: 'B' })
    ).toBe('abandon')
  })

  it('does nothing without a guest', () => {
    expect(
      guestMergeStep({ guestId: null, pendingFor: 'A', userId: 'B' })
    ).toBe('none')
  })
})

describe('foldGuestIntoUser', () => {
  it('drops the guest cookie once every merge succeeds', async () => {
    await foldGuestIntoUser('A')

    expect(mocks.mergeIelts).toHaveBeenCalledWith(GUEST, 'A')
    expect(mocks.clearGuestCookie).toHaveBeenCalled()
    expect(mocks.setGuestMergeOwner).not.toHaveBeenCalled()
  })

  it('keeps the guest for this account only when a merge fails', async () => {
    mocks.mergeIelts.mockRejectedValue(new Error('db blip'))

    await foldGuestIntoUser('A')

    expect(mocks.mergeGrammar).toHaveBeenCalled()
    expect(mocks.clearGuestCookie).not.toHaveBeenCalled()
    expect(mocks.setGuestMergeOwner).toHaveBeenCalledWith('A')
  })

  it("never hands A's leftovers to B on a shared browser", async () => {
    mocks.getGuestMergeOwner.mockResolvedValue('A')

    await foldGuestIntoUser('B')

    expect(mocks.mergeDictation).not.toHaveBeenCalled()
    expect(mocks.mergeIelts).not.toHaveBeenCalled()
    expect(mocks.clearGuestCookie).toHaveBeenCalled()
  })
})
