import { beforeEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  configured: true,
  findById: vi.fn(),
  findOne: vi.fn(),
}))

vi.mock('@/constants/environments', async importOriginal => ({
  ...(await importOriginal<typeof import('@/constants/environments')>()),
  hasMongoDbUri: () => db.configured,
}))
vi.mock('@/lib/db/connectDatabase', () => ({ connectDatabase: vi.fn() }))
vi.mock('@/models/UserModel', () => ({
  UserModel: {
    findById: (...args: unknown[]) => ({ lean: () => db.findById(...args) }),
    findOne: (...args: unknown[]) => ({ lean: () => db.findOne(...args) }),
  },
}))

const {
  ACCOUNT_STATUS_TTL_MS,
  clearAccountStatusCache,
  forgetAccountStatus,
  getAccountBlock,
  isAccountBlocked,
  isEmailLocked,
} = await import('./accountStatus')

const USER_ID = '6a5074f66c2397cc339c6e78'
const NOW = 1_800_000_000_000

beforeEach(() => {
  db.configured = true
  db.findById.mockReset()
  db.findOne.mockReset()
  clearAccountStatusCache()
})

describe('isAccountBlocked', () => {
  it('lets an active account through', async () => {
    db.findById.mockResolvedValue({ status: 'active' })

    await expect(isAccountBlocked(USER_ID, NOW)).resolves.toBe(false)
  })

  it('blocks a locked account and a deleted one, and says which', async () => {
    db.findById.mockResolvedValueOnce({ status: 'locked' })
    await expect(getAccountBlock(USER_ID, NOW)).resolves.toBe('locked')

    db.findById.mockResolvedValueOnce(null)
    await expect(
      getAccountBlock('6a5074f66c2397cc339c6e79', NOW)
    ).resolves.toBe('deleted')
    await expect(
      isAccountBlocked('6a5074f66c2397cc339c6e79', NOW)
    ).resolves.toBe(true)
  })

  it('asks the database once per user per minute', async () => {
    db.findById.mockResolvedValue({ status: 'active' })

    await isAccountBlocked(USER_ID, NOW)
    await isAccountBlocked(USER_ID, NOW + ACCOUNT_STATUS_TTL_MS - 1)
    expect(db.findById).toHaveBeenCalledTimes(1)

    db.findById.mockResolvedValue({ status: 'locked' })
    await expect(
      isAccountBlocked(USER_ID, NOW + ACCOUNT_STATUS_TTL_MS)
    ).resolves.toBe(true)
    expect(db.findById).toHaveBeenCalledTimes(2)
  })

  it('looks again at once after an admin action forgets the user', async () => {
    db.findById.mockResolvedValueOnce({ status: 'active' })
    await isAccountBlocked(USER_ID, NOW)

    forgetAccountStatus(USER_ID)
    db.findById.mockResolvedValueOnce({ status: 'locked' })

    await expect(isAccountBlocked(USER_ID, NOW + 1)).resolves.toBe(true)
  })

  it('skips the lookup without a database or for a malformed id', async () => {
    db.configured = false
    await expect(isAccountBlocked(USER_ID, NOW)).resolves.toBe(false)

    db.configured = true
    await expect(isAccountBlocked('not-an-id', NOW)).resolves.toBe(false)
    expect(db.findById).not.toHaveBeenCalled()
  })

  it('fails open when the database errors', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    db.findById.mockRejectedValue(new Error('down'))

    await expect(isAccountBlocked(USER_ID, NOW)).resolves.toBe(false)
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})

describe('isEmailLocked', () => {
  it('matches the stored, lower-cased email', async () => {
    db.findOne.mockResolvedValue({ status: 'locked' })

    await expect(isEmailLocked('  Ann@Example.COM ')).resolves.toBe(true)
    expect(db.findOne).toHaveBeenCalledWith(
      { email: 'ann@example.com' },
      { status: 1 }
    )
  })

  it('is false for an unknown or active email', async () => {
    db.findOne.mockResolvedValueOnce(null)
    await expect(isEmailLocked('new@example.com')).resolves.toBe(false)

    db.findOne.mockResolvedValueOnce({ status: 'active' })
    await expect(isEmailLocked('ann@example.com')).resolves.toBe(false)
  })
})
