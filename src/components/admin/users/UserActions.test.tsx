import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deleteUserAction: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  setUserLockedAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
}))
vi.mock('@/modules/admin/users/userAdminActions', () => ({
  deleteUserAction: mocks.deleteUserAction,
  setUserLockedAction: mocks.setUserLockedAction,
}))

const { UserActions } = await import('./UserActions')

const BOB = {
  email: 'bob@example.com',
  id: '6a5074f66c2397cc339c6e79',
  name: 'Bob',
  status: 'active' as const,
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset()
})

describe('UserActions', () => {
  it('only explains why for your own account or an admin', () => {
    const { rerender } = render(
      <UserActions
        block="self"
        user={BOB}
      />
    )

    expect(screen.getByRole('status')).toHaveTextContent('your own account')
    expect(screen.queryByRole('button')).toBeNull()

    rerender(
      <UserActions
        block="admin"
        user={BOB}
      />
    )
    expect(screen.getByRole('status')).toHaveTextContent('ADMIN_EMAILS')
  })

  it('locks after the confirm and refreshes the page', async () => {
    mocks.setUserLockedAction.mockResolvedValue({ ok: true })
    render(
      <UserActions
        block={null}
        user={BOB}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Lock account' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      Array.from(dialog.querySelectorAll('button')).find(
        button => button.textContent === 'Lock account'
      ) as HTMLButtonElement
    )

    await waitFor(() =>
      expect(mocks.setUserLockedAction).toHaveBeenCalledWith(BOB.id, true)
    )
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
    expect(await screen.findByText('Account locked.')).toBeVisible()
  })

  it('offers unlock for a locked account', () => {
    render(
      <UserActions
        block={null}
        user={{ ...BOB, status: 'locked' }}
      />
    )

    expect(screen.getByRole('button', { name: 'Unlock account' })).toBeEnabled()
  })

  it('deletes only once the email is typed back, then leaves for the list', async () => {
    mocks.deleteUserAction.mockResolvedValue({ ok: true })
    render(
      <UserActions
        block={null}
        user={BOB}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    const confirm = await screen.findByRole('button', {
      name: 'Delete for good',
    })

    expect(confirm).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'bob@example.com' },
    })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)

    await waitFor(() =>
      expect(mocks.deleteUserAction).toHaveBeenCalledWith(
        BOB.id,
        'bob@example.com'
      )
    )
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith('/admin/users')
    )
  })

  it('keeps the dialog open with the reason when the delete is refused', async () => {
    mocks.deleteUserAction.mockResolvedValue({
      ok: false,
      message: 'This user no longer exists.',
    })
    render(
      <UserActions
        block={null}
        user={BOB}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))
    fireEvent.change(await screen.findByRole('textbox'), {
      target: { value: 'bob@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no longer exists'
    )
    expect(mocks.replace).not.toHaveBeenCalled()
  })
})
