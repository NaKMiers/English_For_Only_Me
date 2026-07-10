/**
 * Sentinel owner id used for pre-auth (single-tenant) practice data. Kept in a
 * leaf module so both getCurrentOwnerId and the auth user-provisioning claim can
 * import it without a circular dependency.
 */
export const PERSONAL_OWNER_ID = 'english-for-only-me-personal-owner'
