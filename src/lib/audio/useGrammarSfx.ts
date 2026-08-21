'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

import {
  GRAMMAR_SFX_STORAGE_KEY,
  GRAMMAR_STINGS,
  type GrammarSting,
} from './grammarSfx'
import { zzfx } from './zzfx'

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Also follow the preference across tabs: turning sound off in one tab should
  // not leave another tab making noise.
  window.addEventListener('storage', listener)

  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function readPreference() {
  try {
    return window.localStorage.getItem(GRAMMAR_SFX_STORAGE_KEY) === 'on'
  } catch {
    // Private mode, or storage disabled by policy. Silence is the safe default.
    return false
  }
}

function writePreference(enabled: boolean) {
  try {
    window.localStorage.setItem(GRAMMAR_SFX_STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // The preference will not persist. The toggle still works this session.
  }

  for (const listener of listeners) listener()
}

/**
 * Four sound effects, off until asked for.
 *
 * Three constraints shape this entirely:
 *
 * 1. **Off by default.** Sound arriving unrequested on a study page is a reason
 *    to close the tab. The preference is persisted, so enabling it is a decision
 *    made once.
 * 2. **The context must be created or resumed synchronously inside a user
 *    gesture.** Autoplay policy blocks a context created in the callback of an
 *    awaited fetch - which is exactly where a drill result arrives - so it is
 *    minted by the toggle click. Creating it lazily at first `play()` works in
 *    development and fails silently in production, which is the worst available
 *    failure mode.
 * 3. **The preference is external state, so it is read with
 *    `useSyncExternalStore`.** Reading it in an effect and calling `setState`
 *    causes the cascading render the lint rule is there to prevent, and reading
 *    it in a `useState` initializer would break the server render - this is a
 *    client component, but client components are still rendered on the server.
 */
export function useGrammarSfx() {
  const enabled = useSyncExternalStore(subscribe, readPreference, () => false)
  const contextRef = useRef<AudioContext | null>(null)

  // Tear the context down on unmount: an abandoned AudioContext holds an audio
  // thread open, and browsers cap how many a page may create.
  useEffect(
    () => () => {
      void contextRef.current?.close()
      contextRef.current = null
    },
    []
  )

  /** Must be called FROM a user gesture handler, never after an await. */
  const toggle = useCallback(() => {
    const next = !enabled

    writePreference(next)

    if (!next) return

    const Context =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext

    if (!Context) return

    // Created inside the click. This is the only place a context is minted.
    contextRef.current ??= new Context()
    void contextRef.current.resume()
  }, [enabled])

  const play = useCallback(
    (sting: GrammarSting) => {
      if (!enabled) return

      const context = contextRef.current

      if (!context) return

      // A browser may suspend the context between gestures. Resuming is a no-op
      // when it is already running.
      if (context.state === 'suspended') void context.resume()

      zzfx(context, GRAMMAR_STINGS[sting])
    },
    [enabled]
  )

  return { enabled, play, toggle }
}
