import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { en } from '@/i18n/messages/en'
import { expectLandingBudget } from '@/test/landingBudget'

import { HomeSimpleView } from './HomeSimpleView'

function renderSimple(props: Partial<Parameters<typeof HomeSimpleView>[0]>) {
  return render(
    <HomeSimpleView
      accuracyPercent={null}
      buddy={null}
      dictationDue={0}
      grammarDue={0}
      messages={en}
      nextGrammarHref="/grammar/lessons/a1-be"
      nextGrammarTitle="To be"
      vocabularyDue={0}
      weeklyMinutes={0}
      wordsKnown={0}
      {...props}
    />
  )
}

describe('HomeSimpleView', () => {
  test('cards due: the next stop opens the recall session, its row leaves the list', () => {
    const { container } = renderSimple({ vocabularyDue: 5 })

    const nextStop = container.querySelector('[data-next-stop]')
    expect(nextStop?.querySelector('a')?.getAttribute('href')).toBe(
      '/vocabulary?recall=1'
    )
    const list = screen.getByRole('list')
    expect(list.textContent).not.toContain(en.home.simple.vocabularyRecall)
    expect(
      list.querySelector('a[href="/grammar/lessons/a1-be"]')
    ).not.toBeNull()
    expectLandingBudget(container)
  })

  test('nothing due: the next stop is the next lesson itself, not the path', () => {
    const { container } = renderSimple({})

    const nextStop = container.querySelector('[data-next-stop]')
    expect(nextStop?.querySelector('a')?.getAttribute('href')).toBe(
      '/grammar/lessons/a1-be'
    )
    expect(screen.getByRole('list').textContent).not.toContain(
      en.home.simple.grammar
    )
    // With nothing due the vocabulary row leads to the landing.
    expect(
      screen.getByRole('list').querySelector('a[href="/vocabulary"]')
    ).not.toBeNull()
  })
})
