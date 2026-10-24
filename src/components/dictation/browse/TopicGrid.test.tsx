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

  test('renders topic tiles as lazy images at the stored upload URL', () => {
    const now = new Date()
    const html = renderToStaticMarkup(
      <TopicGrid
        topics={[
          {
            createdAt: now,
            description: null,
            hasVideoMedia: false,
            id: 't1',
            lessonCount: 2,
            levelRange: 'A1',
            order: 0,
            sectionCount: 1,
            slug: 'travel',
            thumbnailUrl:
              'https://res.cloudinary.com/demo/image/upload/v1/topic.jpg',
            title: 'Travel',
            updatedAt: now,
          },
        ]}
        noTopicCount={0}
      />
    )

    expect(html).toContain(
      'src="https://res.cloudinary.com/demo/image/upload/v1/topic.jpg"'
    )
    expect(html).toContain('loading="lazy"')
    expect(html).not.toContain('background-image')
  })
})
