export const ENV_KEYS = {
  appOwnerId: 'APP_OWNER_ID',
  ieltsGoal: 'IELTS_GOAL',
  openAiDebriefModel: 'OPENAI_DEBRIEF_MODEL',
  mongoDbUri: 'MONGODB_URI',
  openAiApiKey: 'OPENAI_API_KEY',
  youtubeApiKey: 'YOUTUBE_API_KEY',
  googleClientId: 'GOOGLE_CLIENT_ID',
  googleClientSecret: 'GOOGLE_CLIENT_SECRET',
  authSecret: 'AUTH_SECRET',
  adminEmails: 'ADMIN_EMAILS',
  ownerEmail: 'OWNER_EMAIL',
  siteUrl: 'SITE_URL',
} as const

export class MissingEnvironmentError extends Error {
  constructor(public readonly key: string) {
    super(`${key} is not configured`)
    this.name = 'MissingEnvironmentError'
  }
}

export function getOptionalServerEnv(key: string) {
  const value = process.env[key]?.trim()

  if (!value) return null

  return value
}

export function getRequiredServerEnv(key: string) {
  const value = getOptionalServerEnv(key)

  if (!value) throw new MissingEnvironmentError(key)

  return value
}

export function getMongoDbUri() {
  return getRequiredServerEnv(ENV_KEYS.mongoDbUri)
}

export function hasMongoDbUri() {
  return Boolean(getOptionalServerEnv(ENV_KEYS.mongoDbUri))
}

export function getYoutubeApiKey() {
  return getOptionalServerEnv(ENV_KEYS.youtubeApiKey)
}

export function getOpenAiApiKey() {
  return getOptionalServerEnv(ENV_KEYS.openAiApiKey)
}

export function getOpenAiDebriefModel() {
  return getOptionalServerEnv(ENV_KEYS.openAiDebriefModel) ?? 'gpt-5.4-nano'
}

export function getIeltsGoal() {
  return getOptionalServerEnv(ENV_KEYS.ieltsGoal) ?? 'IELTS Listening Band 7+'
}

export function hasGoogleAuth() {
  return (
    Boolean(getOptionalServerEnv(ENV_KEYS.googleClientId)) &&
    Boolean(getOptionalServerEnv(ENV_KEYS.googleClientSecret))
  )
}

/**
 * Normalized, lower-cased set of admin emails from ADMIN_EMAILS
 * (comma-separated). Empty set when unset.
 */
export function getAdminEmails() {
  const raw = getOptionalServerEnv(ENV_KEYS.adminEmails)

  if (!raw) return new Set<string>()

  return new Set(
    raw
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)
  )
}

/**
 * The single account (lower-cased) that inherits legacy pre-auth practice data
 * on first login. See system-update-plan D12.
 */
export function getOwnerEmail() {
  return getOptionalServerEnv(ENV_KEYS.ownerEmail)?.toLowerCase() ?? null
}

/** Canonical origin for SEO (metadata, sitemap). No trailing slash. */
export function getSiteUrl() {
  const raw =
    getOptionalServerEnv(ENV_KEYS.siteUrl) ??
    getOptionalServerEnv('AUTH_URL') ??
    'http://localhost:3000'

  return raw.replace(/\/+$/, '')
}
