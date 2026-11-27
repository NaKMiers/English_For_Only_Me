'use client'

import { createContext, useContext, useEffect, type ReactNode } from 'react'

import { setActiveMessages } from './active'
import { DEFAULT_LOCALE, type Locale } from './config'
import type { Messages } from './messages'
import { en } from './messages/en'

interface I18nValue {
  locale: Locale
  messages: Messages
}

// English is the default value, so a component rendered without the provider
// (unit tests, an error boundary above the layout) still has its text.
const I18nContext = createContext<I18nValue>({
  locale: DEFAULT_LOCALE,
  messages: en,
})

interface Props {
  children: ReactNode
  locale: Locale
  /**
   * The catalogue for `locale`. Left out for English, which every client
   * bundle already carries as the default.
   */
  messages?: Messages
}

/** Hands the server-resolved language and catalogue to client components. */
export function I18nProvider({ children, locale, messages }: Props) {
  const catalogue = messages ?? en

  useEffect(() => setActiveMessages(catalogue), [catalogue])

  return (
    <I18nContext.Provider value={{ locale, messages: catalogue }}>
      {children}
    </I18nContext.Provider>
  )
}

/** The message catalogue for the learner's language, in client components. */
export function useMessages(): Messages {
  return useContext(I18nContext).messages
}

/** The learner's UI language, in client components. */
export function useLocale(): Locale {
  return useContext(I18nContext).locale
}
