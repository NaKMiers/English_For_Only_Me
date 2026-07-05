import { BookOpen } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { ModuleCard } from './ModuleCard'

describe('ModuleCard', () => {
  test('renders an active module as a real link', () => {
    const html = renderToStaticMarkup(
      <ModuleCard
        href="/dictation"
        title="Dictation Lab"
        description="Sentence listening practice"
        pageTag="Active"
        skill="Listening"
        status="active"
        icon={<BookOpen aria-hidden="true" />}
      />
    )

    expect(html).toContain('href="/dictation"')
    expect(html).toContain('Dictation Lab')
    expect(html).toContain('Sentence listening practice')
    expect(html).toContain('Listening')
  })
})
