import {
  BookA,
  GraduationCap,
  Headphones,
  PenLine,
  type LucideIcon,
} from 'lucide-react'

import type { Messages } from '@/i18n/messages'

export type AppModuleKey = 'dictation' | 'vocabulary' | 'grammar' | 'ielts'

/**
 * The study modules, in desk order. Names and descriptions are UI text and
 * live in the catalogue under `common.modules[key]`.
 */
export interface AppModule {
  key: AppModuleKey
  href: string
}

export const APP_MODULES: AppModule[] = [
  { key: 'dictation', href: '/dictation' },
  { key: 'vocabulary', href: '/vocabulary' },
  { key: 'grammar', href: '/grammar' },
  { key: 'ielts', href: '/ielts' },
]

/**
 * The live modules' icons. Server pages pass a module key, never the icon
 * component itself, when a client component draws it: a component type
 * cannot cross the server-to-client boundary as a prop.
 */
export const MODULE_ICONS: Partial<Record<AppModuleKey, LucideIcon>> = {
  dictation: Headphones,
  vocabulary: BookA,
  grammar: PenLine,
  ielts: GraduationCap,
}

export interface NavItem {
  href: string
  /** `home` for the study desk, else the module whose short title it shows. */
  key: 'home' | AppModuleKey
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { key: 'home', href: '/' },
  ...APP_MODULES.map(module => ({ key: module.key, href: module.href })),
]

/** The visible label of a nav item in the learner's language. */
export function navItemLabel(
  item: NavItem,
  messages: Pick<Messages, 'common'>
): string {
  return item.key === 'home'
    ? messages.common.nav.home
    : messages.common.modules[item.key].shortTitle
}
