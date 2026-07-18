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
 * canonical userId for all user-scoped rows: favorites, sessions, attempts,
 * review items, debriefs, and stats. Catalog content (videos, transcripts,
 * segments) is global and not tied to this id.
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
    { returnDocument: 'after', upsert: true }
  ).lean()

  return { id: String(user._id) }
}
