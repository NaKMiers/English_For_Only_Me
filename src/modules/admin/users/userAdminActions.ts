'use server'

import { revalidatePath } from 'next/cache'

import { getMessages } from '@/i18n/server'
import { requireAdmin } from '@/lib/auth/currentUser'
import { connectDatabase } from '@/lib/db/connectDatabase'

import { deleteConfirmationMatches } from './userDirectory'
import {
  deleteUserAndData,
  getUserForAdmin,
  setUserLocked,
  type UserAdminResult,
} from './userAdminService'

export type UserActionState = { ok: true } | { ok: false; message: string }

async function failureMessage(
  result: Exclude<UserAdminResult, { ok: true }>
): Promise<UserActionState> {
  const t = await getMessages()

  return { ok: false, message: t.admin.users.errors[result.reason] }
}

function revalidateUsers(userId: string) {
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
}

/**
 * Lock or unlock an account. Re-checks the admin role server-side (the
 * proxy and admin layout already gate the page, never trusted alone).
 */
export async function setUserLockedAction(
  userId: string,
  locked: boolean
): Promise<UserActionState> {
  const admin = await requireAdmin()

  await connectDatabase()

  const result = await setUserLocked(userId, locked, admin.id)

  if (!result.ok) return failureMessage(result)

  revalidateUsers(userId)

  return { ok: true }
}

/**
 * Delete an account and all of its data. The typed email is checked again
 * here: the dialog's disabled button is only a convenience.
 */
export async function deleteUserAction(
  userId: string,
  typedEmail: string
): Promise<UserActionState> {
  const admin = await requireAdmin()

  await connectDatabase()

  const user = await getUserForAdmin(userId)

  if (!user) return failureMessage({ ok: false, reason: 'notFound' })

  if (!deleteConfirmationMatches(user.email, typedEmail)) {
    const t = await getMessages()

    return { ok: false, message: t.admin.users.errors.confirmMismatch }
  }

  const result = await deleteUserAndData(userId, admin.id)

  if (!result.ok) return failureMessage(result)

  revalidateUsers(userId)

  return { ok: true }
}
