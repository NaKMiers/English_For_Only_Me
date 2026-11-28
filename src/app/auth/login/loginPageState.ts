import type { LoginNotice } from '@/components/auth/LoginCard'

/**
 * The notice for Auth.js's `?error=` code. AccessDenied is the learner (or
 * Google) saying no; Configuration is the server's setup; every other code
 * reads as a plain "try again".
 */
export function noticeForError(
  error: string | null | undefined,
  configured: boolean
): LoginNotice {
  if (!configured) return 'notConfigured'
  if (!error) return null
  if (error === 'AccessDenied') return 'accessDenied'
  if (error === 'Configuration') return 'notConfigured'

  return 'generic'
}

/** The first value of a search param that may be repeated. */
export function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
