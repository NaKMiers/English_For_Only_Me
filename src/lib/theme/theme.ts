/**
 * Light-up mode theme logic (pure, no DOM).
 *
 * The app has two themes: the day "light" (manga on white paper) and the
 * evening "light-up" (manga on lamp-lit paper in a dark room). Light-up turns
 * on automatically in the evening and off in the morning, but a manual toggle
 * wins until the next threshold, after which auto takes back over.
 *
 * Time-of-day windows (local time):
 *
 *   00:00 ────── 06:30 ────────────── 18:30 ────── 24:00
 *   │  light-up  │       light         │  light-up  │
 *
 * These pure helpers are shared by the no-FOUC inline script (stringified into
 * the document head) and the React `useAutoTheme` hook, so both resolve the
 * theme identically. Keep them dependency-free.
 */

export type Theme = 'light' | 'lightup'
export type ThemeSource = 'manual' | 'auto'

export interface StoredThemeState {
  theme: Theme
  source: ThemeSource
  /** ms epoch when a manual override expires (null for auto). */
  expiresAt: number | null
}

/** localStorage key holding the serialized {@link StoredThemeState}. */
export const THEME_STORAGE_KEY = 'efom-theme'

/** Minutes-since-midnight boundaries for the light-up window. */
export const MORNING_THRESHOLD_MIN = 6 * 60 + 30 // 06:30 -> back to light
export const EVENING_THRESHOLD_MIN = 18 * 60 + 30 // 18:30 -> into light-up

/** The theme auto mode picks for a given moment (local time). */
export function autoThemeForTime(now: Date): Theme {
  const minutes = now.getHours() * 60 + now.getMinutes()
  const isLightUp =
    minutes >= EVENING_THRESHOLD_MIN || minutes < MORNING_THRESHOLD_MIN
  return isLightUp ? 'lightup' : 'light'
}

/**
 * The next moment (ms epoch) the auto theme flips. Handles the midnight
 * rollover: an evening override must expire at 06:30 the FOLLOWING day.
 */
export function nextThreshold(now: Date): number {
  const minutes = now.getHours() * 60 + now.getMinutes()
  const at = (dayOffset: number, thresholdMin: number): number => {
    const d = new Date(now)
    d.setHours(0, thresholdMin, 0, 0)
    d.setDate(d.getDate() + dayOffset)
    return d.getTime()
  }

  if (minutes < MORNING_THRESHOLD_MIN) return at(0, MORNING_THRESHOLD_MIN) // -> 06:30 today
  if (minutes < EVENING_THRESHOLD_MIN) return at(0, EVENING_THRESHOLD_MIN) // -> 18:30 today
  return at(1, MORNING_THRESHOLD_MIN) // -> 06:30 tomorrow
}

/**
 * Resolve the theme to show right now given the stored state. A manual choice
 * wins only while unexpired; otherwise (auto, expired, or absent) the
 * time-of-day rule decides.
 */
export function resolveTheme(
  now: Date,
  stored: StoredThemeState | null
): Theme {
  if (
    stored &&
    stored.source === 'manual' &&
    stored.expiresAt != null &&
    now.getTime() < stored.expiresAt
  )
    return stored.theme

  return autoThemeForTime(now)
}

/** Build the stored state for a manual toggle (valid until the next threshold). */
export function manualState(theme: Theme, now: Date): StoredThemeState {
  return { theme, source: 'manual', expiresAt: nextThreshold(now) }
}

/** Safely parse the persisted state; returns null on anything malformed. */
export function parseStoredTheme(raw: string | null): StoredThemeState | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as unknown
    if (typeof value !== 'object' || value === null) return null
    const { theme, source, expiresAt } = value as Record<string, unknown>
    if (theme !== 'light' && theme !== 'lightup') return null
    if (source !== 'manual' && source !== 'auto') return null
    if (expiresAt !== null && typeof expiresAt !== 'number') return null
    return { theme, source, expiresAt }
  } catch {
    return null
  }
}
