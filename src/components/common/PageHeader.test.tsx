import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { PageHeader } from './PageHeader'

describe('PageHeader', () => {
  test('renders the title as the page h1 with its subtitle and actions', () => {
    const html = renderToStaticMarkup(
      <PageHeader
        actions={<a href="/x">Action</a>}
        eyebrow="Listening"
        icon={<svg />}
        iconClassName="bg-pastel-sky"
        subtitle="One line"
        title="All topics"
      />
    )

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<h1[^>]*>All topics<\/h1>/)
    expect(html).toContain('One line')
    expect(html).toContain('Listening')
    expect(html).toContain('href="/x"')
    expect(html).toContain('bg-pastel-sky')
  })

  test('leaves out the optional parts when they are not given', () => {
    const html = renderToStaticMarkup(<PageHeader title="Grammar" />)

    expect(html).not.toContain('<p')
    expect(html).not.toContain('aria-hidden')
  })
})
