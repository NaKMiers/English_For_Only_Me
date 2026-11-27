'use server'

import { refresh } from 'next/cache'
import { cookies } from 'next/headers'

import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from './config'

/**
 * Stores the learner's UI language and re-renders the current page, so
 * server-rendered text switches without a full reload.
 */
export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return

  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, {
    maxAge: LOCALE_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  })
  refresh()
}
