import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { setupDom } from '@/test/setupDom'

import { DictationTranslation } from './DictationTranslation'

setupDom()

describe('DictationTranslation', () => {
  test('stays hidden until unlocked', () => {
    const view = render(
      <DictationTranslation
        isUnlocked={false}
        language="vi"
        text="Xin chao"
      />
    )

    expect(view.queryByText('Translation')).toBeNull()
  })

  test('shows the caption text with a human language label', () => {
    const view = render(
      <DictationTranslation
        isUnlocked
        language="vi"
        text="Xin chao the gioi."
      />
    )

    expect(view.getByText('Xin chao the gioi.')).not.toBeNull()
    expect(view.getByText('Vietnamese')).not.toBeNull()
  })

  test('falls back to a friendly message when no caption overlaps', () => {
    const view = render(
      <DictationTranslation
        isUnlocked
        language="ja"
        text=""
      />
    )

    expect(
      view.getByText('No caption for this moment in the selected language.')
    ).not.toBeNull()
    expect(view.getByText('Japanese')).not.toBeNull()
  })

  test('a failed fetch shows its error in the strip, with an icon', () => {
    const view = render(
      <DictationTranslation
        error="Could not load the translation."
        isUnlocked
        language="vi"
        text=""
      />
    )

    const alert = view.getByRole('alert')
    expect(alert.textContent).toContain('Could not load the translation.')
    expect(alert.querySelector('svg')).not.toBeNull()
  })

  test('the translation is a quiet helper, not the answer', () => {
    const view = render(
      <DictationTranslation
        isUnlocked
        language="vi"
        text="Xin chao"
      />
    )

    const line = view.getByText('Xin chao')
    expect(line.className).toMatch(/text-sm/)
    expect(line.className).toMatch(/text-ink-soft/)
    expect(line.className).not.toMatch(/font-semibold/)
  })
})
