import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { MangaButton } from './MangaButton'

describe('MangaButton', () => {
  test.each([
    ['button', <MangaButton key="button">Open</MangaButton>],
    [
      'link',
      <MangaButton
        key="link"
        href="/vocabulary"
      >
        Open
      </MangaButton>,
    ],
  ])('presses the full 3px down onto its shadow as a %s', (_kind, element) => {
    const html = renderToStaticMarkup(element)

    expect(html).toContain('active:not-aria-[haspopup]:translate-y-[3px]')
    expect(html).not.toContain('active:not-aria-[haspopup]:translate-y-px')
    expect(html).toContain('sticker-press')
  })
})
