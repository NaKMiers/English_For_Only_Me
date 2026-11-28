import 'server-only'

import { isValidObjectId } from 'mongoose'

import { forgetAccountStatus } from '@/lib/auth/accountStatus'
import { resolveRole } from '@/lib/auth/roles'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { GrammarLessonProgressModel } from '@/models/grammar/GrammarLessonProgressModel'
import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'
import { UserModel } from '@/models/UserModel'
import { USER_OWNED_MODELS } from '@/models/userOwnedModels'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'

import {
  EMPTY_ACTIVITY,
  managementBlock,
  type AdminUserRow,
  type UserActivityCounts,
  type UserManagementBlock,
} from './userDirectory'

/**
 * Admin user management, database half. Callers (the admin pages and
 * userAdminActions) have already checked requireAdmin and connected.
 *
 * Activity counts are one grouped count per module over all users:
 *
 *   dictation  = dictation sessions   (userId)
 *   grammar    = lessons with progress (userId)
 *   ielts      = IELTS attempts        (ownerId)
 *   vocabulary = words in the deck     (userId)
 */

const ACTIVITY_SOURCES = [
  { key: 'dictation', model: DictationSessionModel, ownerField: 'userId' },
  { key: 'grammar', model: GrammarLessonProgressModel, ownerField: 'userId' },
  { key: 'ielts', model: IeltsAttemptModel, ownerField: 'ownerId' },
  { key: 'vocabulary', model: UserVocabItemModel, ownerField: 'userId' },
] as const

type ActivityByUser = Map<string, UserActivityCounts>

async function countActivity(userIds?: string[]): Promise<ActivityByUser> {
  const byUser: ActivityByUser = new Map()
  const results = await Promise.all(
    ACTIVITY_SOURCES.map(async source => {
      const match = userIds
        ? { [source.ownerField]: { $in: userIds } }
        : { [source.ownerField]: { $type: 'string' } }
      const groups = await (
        source.model as unknown as typeof DictationSessionModel
      ).aggregate<{ _id: string; count: number }>([
        { $match: match },
        { $group: { _id: `$${source.ownerField}`, count: { $sum: 1 } } },
      ])

      return { key: source.key, groups }
    })
  )

  for (const { groups, key } of results)
    for (const group of groups) {
      const counts = byUser.get(group._id) ?? { ...EMPTY_ACTIVITY }

      counts[key] = group.count
      byUser.set(group._id, counts)
    }

  return byUser
}

interface UserLean {
  _id: unknown
  email: string
  name?: string | null
  image?: string | null
  status?: string | null
  createdAt?: Date | null
  lastLoginAt?: Date | null
  lockedAt?: Date | null
}

function iso(value: Date | null | undefined) {
  return value ? new Date(value).toISOString() : null
}

function toRow(user: UserLean, activity: ActivityByUser): AdminUserRow {
  const id = String(user._id)

  return {
    id,
    email: user.email,
    name: user.name ?? null,
    image: user.image ?? null,
    role: resolveRole(user.email),
    status: user.status === 'locked' ? 'locked' : 'active',
    createdAt: iso(user.createdAt),
    lastLoginAt: iso(user.lastLoginAt),
    lockedAt: iso(user.lockedAt),
    activity: activity.get(id) ?? { ...EMPTY_ACTIVITY },
  }
}

const USER_FIELDS = {
  email: 1,
  name: 1,
  image: 1,
  status: 1,
  createdAt: 1,
  lastLoginAt: 1,
  lockedAt: 1,
} as const

/** Every user with their activity, most recent sign-in first. */
export async function listUsersForAdmin(): Promise<AdminUserRow[]> {
  const [users, activity] = await Promise.all([
    UserModel.find({}, USER_FIELDS)
      .sort({ lastLoginAt: -1, createdAt: -1 })
      .lean<UserLean[]>(),
    countActivity(),
  ])

  return users.map(user => toRow(user, activity))
}

/** One user with their activity, or null for an unknown or malformed id. */
export async function getUserForAdmin(
  userId: string
): Promise<AdminUserRow | null> {
  if (!isValidObjectId(userId)) return null

  const [user, activity] = await Promise.all([
    UserModel.findById(userId, USER_FIELDS).lean<UserLean>(),
    countActivity([userId]),
  ])

  return user ? toRow(user, activity) : null
}

export type UserAdminResult =
  { ok: true } | { ok: false; reason: UserManagementBlock | 'notFound' }

async function loadManageable(
  userId: string,
  actorId: string
): Promise<
  | { ok: true; user: AdminUserRow }
  | { ok: false; reason: UserManagementBlock | 'notFound' }
> {
  const user = await getUserForAdmin(userId)

  if (!user) return { ok: false, reason: 'notFound' }

  const block = managementBlock(user, actorId)

  if (block) return { ok: false, reason: block }

  return { ok: true, user }
}

/**
 * Lock or unlock an account. A lock refuses the next Google sign-in and,
 * through accountStatus, ends the current session within a minute.
 */
export async function setUserLocked(
  userId: string,
  locked: boolean,
  actorId: string
): Promise<UserAdminResult> {
  const found = await loadManageable(userId, actorId)

  if (!found.ok) return found

  await UserModel.updateOne(
    { _id: userId },
    locked
      ? { $set: { status: 'locked', lockedAt: new Date() } }
      : { $set: { status: 'active', lockedAt: null } }
  )
  forgetAccountStatus(userId)

  return { ok: true }
}

/**
 * Delete an account and every row it owns (USER_OWNED_MODELS). The practice
 * rows go first, so a failure part-way leaves the user row in place and the
 * admin can simply run the delete again. Cannot be undone. Signing in with
 * Google again later creates a fresh, empty account.
 */
export async function deleteUserAndData(
  userId: string,
  actorId: string
): Promise<UserAdminResult & { deletedRows?: number }> {
  const found = await loadManageable(userId, actorId)

  if (!found.ok) return found

  const results = await Promise.all(
    USER_OWNED_MODELS.map(({ model, ownerField }) =>
      model.deleteMany({ [ownerField]: userId })
    )
  )

  await UserModel.deleteOne({ _id: userId })
  forgetAccountStatus(userId)

  const deletedRows = results.reduce(
    (sum, result) => sum + (result.deletedCount ?? 0),
    0
  )

  console.info(
    `[admin/users] deleted user ${userId} and ${deletedRows} owned rows (by ${actorId})`
  )

  return { ok: true, deletedRows }
}
