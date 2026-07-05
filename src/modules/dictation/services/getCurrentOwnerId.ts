import { ENV_KEYS, getOptionalServerEnv } from '@/constants/environments'

export const PERSONAL_OWNER_ID = 'english-for-only-me-personal-owner'

export async function getCurrentOwnerId() {
  return getOptionalServerEnv(ENV_KEYS.appOwnerId) ?? PERSONAL_OWNER_ID
}
