'use client'

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import {
  autoThemeForTime,
  manualState,
  nextThreshold,
  parseStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/lib/theme/theme'

interface ThemeContextValue {
  theme: Theme
  /** Flip to the other theme as an explicit manual override. */
  toggle: () => void
}

// Default to an inert light-mode value rather than null. AppTopbar (which
// hosts the toggle) also renders inside error.tsx client boundaries where the
// provider may be absent; a safe default keeps chrome rendering instead of
// throwing and taking the page down.
const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
})

// ---------------------------------------------------------------------------
// External theme store (subscribed via useSyncExternalStore). The theme is
// derived state living outside React: it depends on localStorage + the wall
// clock, and flips on a timer or when the tab regains focus. Modeling it as an
// external store is the React-blessed way to read it without setState-in-effect
// and without SSR hydration mismatches (getServerSnapshot pins 'light').
// ---------------------------------------------------------------------------

function readStored() {
  try {
    return parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return null
  }
}

const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined
let teardown: (() => void) | undefined

function notify() {
  for (const listener of listeners) listener()
}

// The next flip is the sooner of the auto threshold or a manual expiry. A
// single long setTimeout is unreliable across sleep / background throttling, so
// subscribe() also re-checks on visibilitychange + focus.
function scheduleNext() {
  if (timer) clearTimeout(timer)
  const stored = readStored()
  const auto = nextThreshold(new Date())
  const manualExpiry =
    stored?.source === 'manual' && stored.expiresAt != null
      ? stored.expiresAt
      : Infinity
  const delay = Math.max(0, Math.min(auto, manualExpiry) - Date.now())
  timer = setTimeout(() => {
    notify()
    scheduleNext()
  }, delay)
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  if (listeners.size === 1) {
    const onVisible = () => {
      if (document.visibilityState === 'visible') notify()
    }
    scheduleNext()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    teardown = () => {
      if (timer) clearTimeout(timer)
      timer = undefined
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }
  return () => {
    listeners.delete(onChange)
    if (listeners.size === 0 && teardown) {
      teardown()
      teardown = undefined
    }
  }
}

// Primitive snapshot - stable under Object.is when the theme has not changed,
// so recomputing per call (with a fresh Date) never loops.
const getSnapshot = (): Theme => resolveTheme(new Date(), readStored())
const getServerSnapshot = (): Theme => 'light'

function toggleTheme() {
  const now = new Date()
  const current = resolveTheme(now, readStored())
  const next: Theme = current === 'lightup' ? 'light' : 'lightup'
  // If the pick matches what auto would show anyway, store it as auto so we do
  // not pin an override that merely mirrors the clock.
  const state =
    autoThemeForTime(now) === next
      ? { theme: next, source: 'auto' as const, expiresAt: null }
      : manualState(next, now)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage failures (private mode etc.) - theme still applies
  }
  scheduleNext()
  notify()
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Keep the <html data-theme> attribute in sync with the resolved theme. The
  // no-FOUC inline script sets it before paint; this reconciles it afterward.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, toggle: toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
