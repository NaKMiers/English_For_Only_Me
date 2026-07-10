import 'server-only'

import { PERSONAL_OWNER_ID } from './ownerConstants'

export { PERSONAL_OWNER_ID }

/**
 * The app is single-tenant: content is created by admins and practiced by
 * everyone, with no per-user ownership. All practice data is written under one
 * shared owner id. This helper stays only to populate the (now inert) `ownerId`
 * schema field on inserts; nothing gates access on its value anymore.
 */
export async function getCurrentOwnerId() {
  return PERSONAL_OWNER_ID
}
