import type { Locale } from '../config'
import { en, type Messages } from './en'
import { vi } from './vi'

export type { Messages }

export const MESSAGES: Record<Locale, Messages> = { en, vi }
