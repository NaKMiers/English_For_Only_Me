import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { TopicGrid } from './TopicGrid'

describe('TopicGrid', () => {
  test('renders uncategorized with the regular topic colors', () => {
    const html = renderToStaticMarkup(
      <TopicGrid
        topics={[]}
        noTopicCount={3}
      />
    )

    expect(html).toContain('Uncategorized')
    expect(html).toContain('href="/dictation/no-topic"')
    expect(html).toContain('bg-manga-white')
    expect(html).toContain('bg-manga-pale-red')
    expect(html).not.toContain('bg-manga-paper ')
  })
})
