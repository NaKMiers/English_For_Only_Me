import 'server-only'

import { cookies } from 'next/headers'
import { cache } from 'react'

import { LOCALE_COOKIE, resolveLocale, type Locale } from './config'
import { MESSAGES, type Messages } from './messages'

/**
 * The learner's UI language for this request, from the locale cookie.
 * Works in server components, `generateMetadata`, route handlers and server
 * actions. Cached per request.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies()
  return resolveLocale(store.get(LOCALE_COOKIE)?.value)
})

/** The message catalogue for this request's language. */
export async function getMessages(): Promise<Messages> {
  return MESSAGES[await getLocale()]
}
