import { renderHook } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { setupDom } from '@/test/setupDom'

import {
  getDictationShortcutAction,
  shouldIgnoreDictationShortcut,
  useDictationShortcuts,
} from './shortcuts'

setupDom()

describe('dictation shortcuts', () => {
  test('ignores unrelated editable controls', () => {
    const input = document.createElement('input')
    const select = document.createElement('select')
    const unrelatedTextarea = document.createElement('textarea')

    expect(shouldIgnoreDictationShortcut(input)).toBe(true)
    expect(shouldIgnoreDictationShortcut(select)).toBe(true)
    expect(shouldIgnoreDictationShortcut(unrelatedTextarea)).toBe(true)
  })

  test('allows the dictation answer box to opt into shortcuts', () => {
    const textarea = document.createElement('textarea')

    textarea.dataset.dictationShortcuts = 'allow'

    expect(shouldIgnoreDictationShortcut(textarea)).toBe(false)
  })

  test('maps Alt key tap to replay', () => {
    const event = new window.KeyboardEvent('keydown', {
      altKey: true,
      key: 'Alt',
    })

    expect(getDictationShortcutAction(event)).toBe('replay')
  })

  test('maps Command key tap to replay', () => {
    const event = new window.KeyboardEvent('keydown', {
      key: 'Meta',
      metaKey: true,
    })

    expect(getDictationShortcutAction(event)).toBe('replay')
  })

  test('maps Ctrl + brackets to navigation', () => {
    const next = new window.KeyboardEvent('keydown', {
      ctrlKey: true,
      key: ']',
    })
    const previous = new window.KeyboardEvent('keydown', {
      ctrlKey: true,
      key: '[',
    })

    expect(getDictationShortcutAction(next)).toBe('next')
    expect(getDictationShortcutAction(previous)).toBe('previous')
  })

  test('maps Escape to the practice escape action', () => {
    const event = new window.KeyboardEvent('keydown', {
      key: 'Escape',
    })

    expect(getDictationShortcutAction(event)).toBe('escape')
  })
})

describe('useDictationShortcuts', () => {
  test('binds one listener and always calls the latest handler', () => {
    const addListener = vi.spyOn(window, 'addEventListener')
    const first = vi.fn()
    const second = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ check }) =>
        useDictationShortcuts({ enabled: true, handlers: { check } }),
      { initialProps: { check: first } }
    )

    rerender({ check: second })
    rerender({ check: second })

    const keydownBindings = addListener.mock.calls.filter(
      ([type]) => type === 'keydown'
    )

    expect(keydownBindings).toHaveLength(1)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)

    unmount()
    addListener.mockRestore()
  })
})
