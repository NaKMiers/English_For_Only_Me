import type { AppModuleKey } from './modules'

/** Day palette, mirrored from the `:root` vars in `src/app/globals.css`. */
export const THEME_COLORS = {
  canvas: '#f3eaf2',
  surface: '#ffffff',
  ink: '#25171f',
  inkSoft: '#73636d',
  line: '#f0e7ed',
  brand: '#c93a74',
  danger: '#c03810',
} as const

export const PAGE_TAG_TONES = {
  default: 'bg-surface-muted text-ink',
  red: 'bg-brand-soft text-brand-ink',
  ink: 'bg-cta text-cta-fg',
  pale: 'bg-tint text-ink',
  sky: 'bg-pastel-sky text-accent-blue',
  yellow: 'bg-pastel-lemon text-ink',
  copper: 'bg-pastel-peach text-accent-orange',
  silver: 'bg-surface-muted text-ink-soft',
  gold: 'bg-pastel-cream text-accent-orange',
  diamond: 'bg-pastel-mint text-accent-green',
} as const

export interface ModuleTheme {
  /** Pastel card fill. */
  tint: string
  /** Text / icon colour that reads on the tint and on white. */
  accent: string
  /** Outline for the module's filter chip. */
  outline: string
}

/**
 * One pastel per module, used by cards, chips and the sidebar. Pink is the
 * brand, so no module wears it.
 */
export const MODULE_THEMES: Record<AppModuleKey, ModuleTheme> = {
  dictation: {
    tint: 'bg-pastel-sky',
    accent: 'text-accent-blue',
    outline: 'border-accent-blue/50',
  },
  vocabulary: {
    tint: 'bg-pastel-mint',
    accent: 'text-accent-green',
    outline: 'border-accent-green/50',
  },
  grammar: {
    tint: 'bg-pastel-lilac',
    accent: 'text-accent-purple',
    outline: 'border-accent-purple/50',
  },
  ielts: {
    tint: 'bg-pastel-peach',
    accent: 'text-accent-orange',
    outline: 'border-accent-orange/50',
  },
  'writing-notes': {
    tint: 'bg-pastel-cream',
    accent: 'text-accent-orange',
    outline: 'border-accent-orange/50',
  },
  'ai-coach': {
    tint: 'bg-pastel-mint',
    accent: 'text-accent-green',
    outline: 'border-accent-green/50',
  },
  reading: {
    tint: 'bg-pastel-lemon',
    accent: 'text-accent-green',
    outline: 'border-accent-green/50',
  },
  speaking: {
    tint: 'bg-pastel-mint',
    accent: 'text-accent-green',
    outline: 'border-accent-green/50',
  },
}
