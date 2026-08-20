export const ENV_KEYS = {
  ieltsGoal: 'IELTS_GOAL',
  openAiDebriefModel: 'OPENAI_DEBRIEF_MODEL',
  openAiGrammarModel: 'OPENAI_GRAMMAR_MODEL',
  openAiTranslationModel: 'OPENAI_TRANSLATION_MODEL',
  mongoDbUri: 'MONGODB_URI',
  openAiApiKey: 'OPENAI_API_KEY',
  cloudinaryUrl: 'CLOUDINARY_URL',
  youtubeApiKey: 'YOUTUBE_API_KEY',
  googleClientId: 'GOOGLE_CLIENT_ID',
  googleClientSecret: 'GOOGLE_CLIENT_SECRET',
  authSecret: 'AUTH_SECRET',
  adminEmails: 'ADMIN_EMAILS',
  siteUrl: 'SITE_URL',
  myMemoryEmail: 'MYMEMORY_EMAIL',
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

/**
 * Model used to author grammar lesson bodies.
 *
 * Deliberately a tier above the app's other AI features, which use nano. This
 * is the one place where a confidently-worded wrong answer does lasting damage,
 * because the learner studies from it rather than glancing at it.
 *
 * That is not a hypothetical. Generating the definite-article lesson on
 * gpt-5.4-nano produced ten "common mistakes" of which eight were correct
 * English marked as errors ("I work in a hospital", "I want to buy a car"), and
 * drills that listed the very mistake being taught as an accepted answer. The
 * same prompt on gpt-5.4-mini produced accurate content that passed validation.
 * The run happens once; the lesson is read many times.
 */
export function getOpenAiGrammarModel() {
  return getOptionalServerEnv(ENV_KEYS.openAiGrammarModel) ?? 'gpt-5.4-mini'
}

/**
 * Optional email passed to MyMemory as the `de` param. A valid email raises the
 * free translation quota (anonymous per-IP is small; email-tracked is much
 * higher), which we need for bulk vocabulary enrichment. Unset = anonymous.
 */
export function getMyMemoryEmail() {
  return getOptionalServerEnv(ENV_KEYS.myMemoryEmail)
}

export function getCloudinaryUrl() {
  return getRequiredServerEnv(ENV_KEYS.cloudinaryUrl)
}

export function getOpenAiDebriefModel() {
  return getOptionalServerEnv(ENV_KEYS.openAiDebriefModel) ?? 'gpt-5.4-nano'
}

/** Model for AI segment translation. Falls back to the debrief model. */
export function getOpenAiTranslationModel() {
  return (
    getOptionalServerEnv(ENV_KEYS.openAiTranslationModel) ??
    getOpenAiDebriefModel()
  )
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

/** Canonical origin for SEO (metadata, sitemap). No trailing slash. */
export function getSiteUrl() {
  const raw =
    getOptionalServerEnv(ENV_KEYS.siteUrl) ??
    getOptionalServerEnv('AUTH_URL') ??
    'http://localhost:3000'

  return raw.replace(/\/+$/, '')
}
