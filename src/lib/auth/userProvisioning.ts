import 'server-only'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { UserModel } from '@/models/UserModel'

interface GoogleProfileInput {
  email: string
  name?: string | null
  image?: string | null
  googleSub?: string | null
}

/**
 * Upsert the app User on sign-in. Returns the Mongo ObjectId string used as the
 * canonical userId for user-scoped rows (e.g. favorites). Practice content and
 * progress are single-tenant and not tied to this id — see getCurrentOwnerId.
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

  return { id: String(user._id) }
}
