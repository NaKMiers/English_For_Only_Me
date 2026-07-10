import 'server-only'

import { ENV_KEYS, getOptionalServerEnv } from '@/constants/environments'

import { getOptionalUser } from './getCurrentUser'
import { PERSONAL_OWNER_ID } from './ownerConstants'

export { PERSONAL_OWNER_ID }

/**
 * Resolve the owner id for per-user data. Now derived from the session: a
 * signed-in user owns their own rows (their Mongo ObjectId). When anonymous, we
 * fall back to the legacy sentinel so single-tenant/dev flows keep working until
 * per-endpoint auth (R3) lands in later chunks.
 */
export async function getCurrentOwnerId() {
  const user = await getOptionalUser()

  if (user) return user.id

  return getOptionalServerEnv(ENV_KEYS.appOwnerId) ?? PERSONAL_OWNER_ID
}
