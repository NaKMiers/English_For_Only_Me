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
        textSize="large"
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
        textSize="large"
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
        textSize="large"
      />
    )

    expect(
      view.getByText('No caption for this moment in the selected language.')
    ).not.toBeNull()
    expect(view.getByText('Japanese')).not.toBeNull()
  })
})
