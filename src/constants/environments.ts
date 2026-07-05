export const ENV_KEYS = {
  appOwnerId: 'APP_OWNER_ID',
  ieltsGoal: 'IELTS_GOAL',
  openAiDebriefModel: 'OPENAI_DEBRIEF_MODEL',
  openAiTranslationModel: 'OPENAI_TRANSLATION_MODEL',
  mongoDbUri: 'MONGODB_URI',
  openAiApiKey: 'OPENAI_API_KEY',
  youtubeApiKey: 'YOUTUBE_API_KEY',
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

export function getOpenAiTranslationModel() {
  return getOptionalServerEnv(ENV_KEYS.openAiTranslationModel) ?? 'gpt-5.4-nano'
}

export function getIeltsGoal() {
  return getOptionalServerEnv(ENV_KEYS.ieltsGoal) ?? 'IELTS Listening Band 7+'
}
