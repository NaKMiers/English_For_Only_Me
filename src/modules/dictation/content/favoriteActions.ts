'use server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'

import {
  addFavorite,
  isFavoritableVideo,
  removeFavorite,
} from './favoriteRepository'

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

/**
 * Set the current user's favorite for a video to `desired`. Idempotent: an
 * upsert when true, a delete when false, so replays and rapid clicks always
 * land on the last desired state (never a toggle). Requires a signed-in user
 * (favorites are per-user); returns `{ favorited }` or `{ favorited: null,
 * needsAuth: true }` when anonymous so the client can prompt sign-in. Throws
 * (so the client rolls back) for a malformed id, or when adding a video that
 * does not exist or is archived. Removing stays allowed for archived videos.
 */
export async function setFavoriteAction(videoId: string, desired: boolean) {
  if (
    typeof videoId !== 'string' ||
    !OBJECT_ID_PATTERN.test(videoId) ||
    typeof desired !== 'boolean'
  )
    throw new Error('Invalid favorite request.')

  const user = await getOptionalUser()
  if (!user) return { favorited: null, needsAuth: true as const }

  await connectDatabase()

  if (desired) {
    if (!(await isFavoritableVideo(videoId)))
      throw new Error('This video is not available to favorite.')

    await addFavorite(user.id, videoId)
  } else await removeFavorite(user.id, videoId)

  return { favorited: desired, needsAuth: false as const }
}
