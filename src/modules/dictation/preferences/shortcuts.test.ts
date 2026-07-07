import { describe, expect, test } from 'vitest'

import { setupDom } from '@/test/setupDom'

import {
  getDictationShortcutAction,
  shouldIgnoreDictationShortcut,
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

  test('maps Control key replay like DailyDictation', () => {
    const event = new window.KeyboardEvent('keydown', {
      ctrlKey: true,
      key: 'Control',
    })

    expect(getDictationShortcutAction(event)).toBe('replay')
  })
})
