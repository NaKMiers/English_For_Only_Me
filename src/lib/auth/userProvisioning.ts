import 'server-only'

import {
  ENV_KEYS,
  getOptionalServerEnv,
  getOwnerEmail,
} from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { UserModel } from '@/models/UserModel'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { PERSONAL_OWNER_ID } from '@/modules/dictation/services/ownerConstants'

interface GoogleProfileInput {
  email: string
  name?: string | null
  image?: string | null
  googleSub?: string | null
}

/**
 * The owner id legacy (pre-auth) practice data was written under. Mirrors the
 * old getCurrentOwnerId() resolution so the claim finds the right rows.
 */
function legacyOwnerId() {
  return getOptionalServerEnv(ENV_KEYS.appOwnerId) ?? PERSONAL_OWNER_ID
}

/**
 * Reassign every pre-auth practice row (owned by the legacy sentinel) to the
 * owner's real user id. Idempotent: once migrated, no rows match the sentinel,
 * so re-running (second device, token refresh) is a no-op. Only the account
 * whose email equals OWNER_EMAIL triggers this — see plan D12/F1.
 */
export async function claimLegacyPracticeData(userId: string) {
  const sentinel = legacyOwnerId()

  if (sentinel === userId) return { claimed: 0 }

  const filter = { ownerId: sentinel }
  const update = { $set: { ownerId: userId } }

  const results = await Promise.all([
    DictationSessionModel.updateMany(filter, update),
    DictationAttemptModel.updateMany(filter, update),
    DictationReviewItemModel.updateMany(filter, update),
    DictationDebriefModel.updateMany(filter, update),
  ])

  const claimed = results.reduce((sum, r) => sum + (r.modifiedCount ?? 0), 0)

  return { claimed }
}

/**
 * Upsert the app User on sign-in and, for the OWNER_EMAIL account only, claim
 * legacy practice data. Returns the Mongo ObjectId string used as the canonical
 * userId across the app (favorites, sessions, ...).
 */
export async function provisionUserOnSignIn(profile: GoogleProfileInput) {
  await connectDatabase()

  const email = profile.email.trim().toLowerCase()

  const user = await UserModel.findOneAndUpdate(
    { email },
    {
      $set: {
        name: profile.name ?? null,
        image: profile.image ?? null,
        googleSub: profile.googleSub ?? null,
        lastLoginAt: new Date(),
      },
      $setOnInsert: { email },
    },
    { new: true, upsert: true }
  ).lean()

  const userId = String(user._id)

  if (getOwnerEmail() === email) await claimLegacyPracticeData(userId)

  return { id: userId }
}
