import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { ActionButton } from './ActionButton'

describe('ActionButton', () => {
  test.each([
    ['button', <ActionButton key="button">Open</ActionButton>],
    [
      'link',
      <ActionButton
        key="link"
        href="/vocabulary"
      >
        Open
      </ActionButton>,
    ],
  ])('is a pill with the soft press as a %s', (_kind, element) => {
    const html = renderToStaticMarkup(element)

    expect(html).toContain('rounded-full')
    expect(html).toContain('soft-press')
  })
})
