import type { Messages } from '@/i18n/messages'

export type AppModuleKey =
  | 'dictation'
  | 'vocabulary'
  | 'grammar'
  | 'ielts'
  | 'writing-notes'
  | 'ai-coach'
  | 'reading'
  | 'speaking'

export type AppModuleStatus = 'active' | 'future' | 'secondary'

/**
 * The study modules, in desk order. Names and descriptions are UI text and
 * live in the catalogue under `common.modules[key]`.
 */
export interface AppModule {
  key: AppModuleKey
  href: string
  status: AppModuleStatus
}

export const APP_MODULES: AppModule[] = [
  { key: 'dictation', href: '/dictation', status: 'active' },
  { key: 'vocabulary', href: '/vocabulary', status: 'active' },
  { key: 'grammar', href: '/grammar', status: 'active' },
  { key: 'ielts', href: '/ielts', status: 'active' },
  { key: 'writing-notes', href: '/writing-notes', status: 'future' },
  { key: 'ai-coach', href: '/ai-coach', status: 'future' },
  { key: 'reading', href: '/reading', status: 'secondary' },
  { key: 'speaking', href: '/speaking', status: 'secondary' },
]

// The IELTS module already covers these skills, so they get no header button.
const NAV_HIDDEN_MODULE_KEYS: AppModuleKey[] = [
  'writing-notes',
  'reading',
  'speaking',
]

export interface NavItem {
  disabled?: boolean
  href: string
  /** `home` for the study desk, else the module whose short title it shows. */
  key: 'home' | AppModuleKey
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { key: 'home', href: '/' },
  ...APP_MODULES.filter(
    module => !NAV_HIDDEN_MODULE_KEYS.includes(module.key)
  ).map(module => ({
    disabled: module.status !== 'active',
    key: module.key,
    href: module.href,
  })),
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
