import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { MetricTile } from './MetricTile'

describe('MetricTile', () => {
  test('renders a stable metric summary', () => {
    const html = renderToStaticMarkup(
      <MetricTile
        label="Listening streak"
        value="12"
        detail="days in rhythm"
        trend="+3 this week"
      />
    )

    expect(html).toContain('Listening streak')
    expect(html).toContain('12')
    expect(html).toContain('days in rhythm')
    expect(html).toContain('+3 this week')
  })

  test('renders as a link when href is provided', () => {
    const html = renderToStaticMarkup(
      <MetricTile
        href="/vocabulary/words?view=learning"
        label="Learning"
        value="7"
      />
    )

    expect(html).toContain('href="/vocabulary/words?view=learning"')
    expect(html).toContain('Learning')
  })
})
