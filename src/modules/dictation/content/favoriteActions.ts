'use server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'

import { toggleFavorite } from './favoriteRepository'

/**
 * Toggle the current user's favorite for a video. Requires a signed-in user
 * (favorites are per-user); returns `{ favorited }` or `{ favorited: null,
 * needsAuth: true }` when anonymous so the client can prompt sign-in.
 */
export async function toggleFavoriteAction(videoId: string) {
  const user = await getOptionalUser()
  if (!user) return { favorited: null, needsAuth: true as const }

  await connectDatabase()
  const result = await toggleFavorite(user.id, videoId)

  return { favorited: result.favorited, needsAuth: false as const }
}
