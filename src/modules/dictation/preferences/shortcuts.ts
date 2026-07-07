'use client'

import { useEffect } from 'react'

export type DictationShortcutAction =
  'check' | 'next' | 'previous' | 'replay' | 'toggleVideo'

export interface DictationShortcutHandlers {
  check?: () => void
  next?: () => void
  previous?: () => void
  replay?: () => void
  toggleVideo?: () => void
}

const EDITABLE_ROLES = new Set(['combobox', 'searchbox', 'spinbutton'])

export function shouldIgnoreDictationShortcut(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  if (target.closest('[data-dictation-shortcuts="allow"]')) return false
  if (target.isContentEditable) return true

  const tagName = target.tagName.toLowerCase()

  if (tagName === 'input' || tagName === 'select' || tagName === 'textarea')
    return true

  const role = target.getAttribute('role')

  return role ? EDITABLE_ROLES.has(role) : false
}

export function getDictationShortcutAction(
  event: KeyboardEvent
): DictationShortcutAction | null {
  const key = event.key.toLowerCase()

  if (key === 'control' && event.ctrlKey && !event.repeat) return 'replay'
  if (event.ctrlKey && key === ' ') return 'replay'
  if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'enter')
    return 'check'
  if (event.altKey && key === 'arrowright') return 'next'
  if (event.altKey && key === 'arrowleft') return 'previous'
  if (event.altKey && key === 'v') return 'toggleVideo'

  return null
}

export function useDictationShortcuts({
  enabled,
  handlers,
}: {
  enabled: boolean
  handlers: DictationShortcutHandlers
}) {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreDictationShortcut(event.target)) return

      const action = getDictationShortcutAction(event)

      if (!action) return

      const handler = handlers[action]

      if (!handler) return

      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handlers])
}
