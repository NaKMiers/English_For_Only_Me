'use client'

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'

import {
  LESSON_SFX_STORAGE_KEY,
  LESSON_STINGS,
  type LessonSting,
} from './lessonSfx'
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
    // On unless the learner muted it: only an explicit 'off' silences.
    return window.localStorage.getItem(LESSON_SFX_STORAGE_KEY) !== 'off'
  } catch {
    // Private mode, or storage disabled by policy: sound on, unpersisted.
    return true
  }
}

function writePreference(enabled: boolean) {
  try {
    window.localStorage.setItem(LESSON_SFX_STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // The preference will not persist. The toggle still works this session.
  }

  for (const listener of listeners) listener()
}

/**
 * Four sound effects, on until the learner mutes them.
 *
 * Three constraints shape this entirely:
 *
 * 1. **On by default, one tap to mute.** Hearing right and wrong is part of
 *    the feedback. Muting is persisted, so it is a decision made once.
 * 2. **The context must be created or resumed synchronously inside a user
 *    gesture.** Autoplay policy blocks a context created in the callback of an
 *    awaited fetch - which is exactly where a saved result arrives. A fresh
 *    page mount has no context yet, so the first `play()` (or the toggle)
 *    mints it - which is why `play()` must itself be called from a click or
 *    key handler, never after an await.
 * 3. **The preference is external state, so it is read with
 *    `useSyncExternalStore`.** Reading it in an effect and calling `setState`
 *    causes the cascading render the lint rule is there to prevent, and reading
 *    it in a `useState` initializer would break the server render - this is a
 *    client component, but client components are still rendered on the server.
 */
export function useLessonSfx() {
  const enabled = useSyncExternalStore(subscribe, readPreference, () => true)
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

    // Created inside the click.
    contextRef.current ??= new Context()
    void contextRef.current.resume()
  }, [enabled])

  /** Must be called FROM a user gesture handler, never after an await. */
  const play = useCallback(
    (sting: LessonSting) => {
      if (!enabled) return

      // Sound was turned on in an earlier lesson: this mount has no context
      // yet. We are inside the gesture that triggered the sting, so mint it.
      if (!contextRef.current) {
        const Context =
          window.AudioContext ??
          (window as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext

        if (Context) contextRef.current = new Context()
      }

      const context = contextRef.current

      if (!context) return

      const playNotes = () => {
        for (const note of LESSON_STINGS[sting]) zzfx(context, note)
      }

      if (context.state === 'running') {
        playNotes()
        return
      }

      // A new context can start suspended, and a browser may suspend it
      // between gestures. resume() is allowed here (we are in the gesture);
      // play once it has, or the first sting of a lesson would be silent.
      void context.resume().then(playNotes)
    },
    [enabled]
  )

  return { enabled, play, toggle }
}
