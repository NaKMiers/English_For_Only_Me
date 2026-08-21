'use client'

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'efom-reduce-motion'
const QUERY = '(prefers-reduced-motion: reduce)'

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)

  const media = window.matchMedia(QUERY)

  media.addEventListener('change', listener)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
    media.removeEventListener('change', listener)
  }
}

/**
 * Read the stored override, or fall back to the operating system.
 *
 * The OS setting is the default and it is honoured with no interaction at all.
 * The in-page toggle exists because a learner may want the animation off HERE
 * without turning it off system-wide - and because the plan's keyboard checklist
 * asks for a reachable control for every setting the page has.
 */
function readPreference() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    if (stored === 'reduce') return true
    if (stored === 'allow') return false
  } catch {
    // Storage unavailable. Fall through to the system setting.
  }

  return window.matchMedia(QUERY).matches
}

/**
 * Should motion be suppressed?
 *
 * Read with `useSyncExternalStore` because it is external state in two places at
 * once - a media query and a stored override - and both have to be able to move
 * it without an effect writing state.
 */
export function useReducedMotion() {
  const reduced = useSyncExternalStore(subscribe, readPreference, () => true)

  const toggle = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, reduced ? 'allow' : 'reduce')
    } catch {
      // Will not persist; still applies this session.
    }

    for (const listener of listeners) listener()
  }, [reduced])

  return { reduced, toggle }
}

/**
 * The same decision for code that is not inside a component.
 *
 * `CreatureMotion` checks this BEFORE starting a sequence rather than cancelling
 * one afterwards: a learner who asked for no motion should never see the first
 * frame.
 */
export function shouldReduceMotion() {
  return readPreference()
}
