import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deleteUserAndData: vi.fn(),
  getUserForAdmin: vi.fn(),
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  setUserLocked: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
// getMessages reads the locale cookie: no cookie means English.
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}))
vi.mock('@/lib/auth/currentUser', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/db/connectDatabase', () => ({ connectDatabase: vi.fn() }))
vi.mock('./userAdminService', () => ({
  deleteUserAndData: mocks.deleteUserAndData,
  getUserForAdmin: mocks.getUserForAdmin,
  setUserLocked: mocks.setUserLocked,
}))

const { deleteUserAction, setUserLockedAction } =
  await import('./userAdminActions')

const TARGET = '6a5074f66c2397cc339c6e79'

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset()
  mocks.requireAdmin.mockResolvedValue({ id: 'admin-id', role: 'admin' })
  mocks.getUserForAdmin.mockResolvedValue({
    id: TARGET,
    email: 'bob@example.com',
    role: 'user',
  })
})

describe('setUserLockedAction', () => {
  it('re-checks the admin, locks as that admin and refreshes the pages', async () => {
    mocks.setUserLocked.mockResolvedValue({ ok: true })

    await expect(setUserLockedAction(TARGET, true)).resolves.toEqual({
      ok: true,
    })
    expect(mocks.requireAdmin).toHaveBeenCalled()
    expect(mocks.setUserLocked).toHaveBeenCalledWith(TARGET, true, 'admin-id')
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/admin/users/${TARGET}`)
  })

  it('says why when the service refuses', async () => {
    mocks.setUserLocked.mockResolvedValue({ ok: false, reason: 'admin' })

    await expect(setUserLockedAction(TARGET, true)).resolves.toEqual({
      ok: false,
      message: 'Admins cannot be locked or deleted here.',
    })
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })

  it('never runs for a non-admin', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('Admin access required'))

    await expect(setUserLockedAction(TARGET, true)).rejects.toThrow()
    expect(mocks.setUserLocked).not.toHaveBeenCalled()
  })
})

describe('deleteUserAction', () => {
  it('refuses when the typed email does not match', async () => {
    await expect(deleteUserAction(TARGET, 'bob@example')).resolves.toEqual({
      ok: false,
      message: 'The email you typed does not match.',
    })
    expect(mocks.deleteUserAndData).not.toHaveBeenCalled()
  })

  it('deletes when the email matches', async () => {
    mocks.deleteUserAndData.mockResolvedValue({ ok: true, deletedRows: 12 })

    await expect(deleteUserAction(TARGET, 'Bob@Example.com')).resolves.toEqual({
      ok: true,
    })
    expect(mocks.deleteUserAndData).toHaveBeenCalledWith(TARGET, 'admin-id')
  })

  it('reports an unknown user', async () => {
    mocks.getUserForAdmin.mockResolvedValue(null)

    await expect(deleteUserAction(TARGET, 'x')).resolves.toEqual({
      ok: false,
      message: 'This user no longer exists.',
    })
  })
})
