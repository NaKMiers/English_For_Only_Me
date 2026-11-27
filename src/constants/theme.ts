import type { AppModuleKey } from './modules'

/** Day palette, mirrored from the `:root` vars in `src/app/globals.css`. */
export const THEME_COLORS = {
  canvas: '#e9e7f8',
  surface: '#ffffff',
  ink: '#1d1b26',
  inkSoft: '#6b6878',
  line: '#ebeaf2',
  brand: '#6457e8',
  danger: '#e5484d',
} as const

export const PAGE_TAG_TONES = {
  default: 'bg-surface-muted text-ink',
  red: 'bg-brand-soft text-brand',
  ink: 'bg-ink text-surface',
  pale: 'bg-tint text-ink',
  sky: 'bg-sky-100 text-sky-900',
  yellow: 'bg-yellow-100 text-yellow-900',
  copper: 'bg-orange-100 text-orange-900',
  silver: 'bg-slate-100 text-slate-800',
  gold: 'bg-amber-200 text-amber-900',
  diamond: 'bg-cyan-100 text-cyan-900',
} as const

export interface ModuleTheme {
  /** Pastel card fill. */
  tint: string
  /** Text / icon colour that reads on the tint and on white. */
  accent: string
  /** Outline for the module's filter chip. */
  outline: string
}

/** One pastel per module, used by cards, chips and the sidebar. */
export const MODULE_THEMES: Record<AppModuleKey, ModuleTheme> = {
  dictation: {
    tint: 'bg-pastel-sky',
    accent: 'text-accent-blue',
    outline: 'border-accent-blue/50',
  },
  vocabulary: {
    tint: 'bg-pastel-rose',
    accent: 'text-accent-pink',
    outline: 'border-accent-pink/50',
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
