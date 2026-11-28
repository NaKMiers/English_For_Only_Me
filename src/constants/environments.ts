export const ENV_KEYS = {
  ieltsGoal: 'IELTS_GOAL',
  qwenDebriefModel: 'QWEN_DEBRIEF_MODEL',
  qwenTranslationModel: 'QWEN_TRANSLATION_MODEL',
  mongoDbUri: 'MONGODB_URI',
  qwenApiKey: 'DASHSCOPE_API_KEY',
  qwenHost: 'DASHSCOPE_HOST',
  cloudinaryUrl: 'CLOUDINARY_URL',
  youtubeApiKey: 'YOUTUBE_API_KEY',
  googleClientId: 'GOOGLE_CLIENT_ID',
  googleClientSecret: 'GOOGLE_CLIENT_SECRET',
  authSecret: 'AUTH_SECRET',
  adminEmails: 'ADMIN_EMAILS',
  siteUrl: 'SITE_URL',
  myMemoryEmail: 'MYMEMORY_EMAIL',
  revalidateSecret: 'REVALIDATE_SECRET',
  qwenIeltsGenerationModel: 'QWEN_IELTS_GENERATION_MODEL',
  qwenIeltsGradingModel: 'QWEN_IELTS_GRADING_MODEL',
  qwenTtsModel: 'QWEN_TTS_MODEL',
  ieltsWritingDailyLimit: 'IELTS_WRITING_DAILY_LIMIT',
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

/** Alibaba Cloud Model Studio (DashScope) key for every AI feature. */
export function getQwenApiKey() {
  return getOptionalServerEnv(ENV_KEYS.qwenApiKey)
}

/**
 * DashScope origin, no trailing slash. Unset means the international host;
 * the console's workspace API host can replace it.
 */
export function getQwenHost() {
  const raw =
    getOptionalServerEnv(ENV_KEYS.qwenHost) ??
    'https://dashscope-intl.aliyuncs.com'

  return raw.replace(/\/+$/, '')
}

/** OpenAI-compatible API root used for structured output. */
export function getQwenCompatibleBaseUrl() {
  return `${getQwenHost()}/compatible-mode/v1`
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

export function getQwenDebriefModel() {
  return getOptionalServerEnv(ENV_KEYS.qwenDebriefModel) ?? 'qwen3.8-flash'
}

/** Model for AI segment translation. Falls back to the debrief model. */
export function getQwenTranslationModel() {
  return (
    getOptionalServerEnv(ENV_KEYS.qwenTranslationModel) ?? getQwenDebriefModel()
  )
}

/** IELTS test generation needs a stronger model than the flash default. */
export function getQwenIeltsGenerationModel() {
  return (
    getOptionalServerEnv(ENV_KEYS.qwenIeltsGenerationModel) ?? 'qwen3.8-max'
  )
}

export function getQwenIeltsGradingModel() {
  return (
    getOptionalServerEnv(ENV_KEYS.qwenIeltsGradingModel) ??
    getQwenIeltsGenerationModel()
  )
}

export function getQwenTtsModel() {
  return (
    getOptionalServerEnv(ENV_KEYS.qwenTtsModel) ?? 'qwen-audio-3.1-tts-flash'
  )
}

/** Successful writing gradings per learner per UTC day. */
export function getIeltsWritingDailyLimit() {
  const raw = Number(getOptionalServerEnv(ENV_KEYS.ieltsWritingDailyLimit))

  return Number.isInteger(raw) && raw > 0 ? raw : 10
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

/**
 * Shared secret for POST /api/admin/revalidate, so seed scripts can expire the
 * content cache without an admin session. Unset disables the secret path; the
 * route then accepts signed-in admins only.
 */
export function getRevalidateSecret() {
  return getOptionalServerEnv(ENV_KEYS.revalidateSecret)
}
