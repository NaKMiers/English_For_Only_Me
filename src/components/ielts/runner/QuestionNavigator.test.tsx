import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { QuestionNavigator } from './QuestionNavigator'

const INDEX = [1, 2, 3].map(number => ({
  number,
  part: number,
  sectionKey: `r${number}`,
  setStart: null,
}))

describe('QuestionNavigator', () => {
  it('links to the previous and next skill around the part switcher', () => {
    render(
      <QuestionNavigator
        answers={{}}
        currentNumber={1}
        currentPart={1}
        index={INDEX}
        next={{ href: '/ielts/t/writing', label: 'Writing' }}
        onPartChange={() => undefined}
        onSelect={() => undefined}
        partLabel={part => `Passage ${part}`}
        prev={{ href: '/ielts/t/listening', label: 'Listening' }}
      />
    )

    expect(
      screen.getByRole('link', { name: 'Listening' }).getAttribute('href')
    ).toBe('/ielts/t/listening')
    expect(
      screen.getByRole('link', { name: 'Writing' }).getAttribute('href')
    ).toBe('/ielts/t/writing')
    expect(
      screen.getByRole('button', { name: 'Passage 1, 0 of 1 answered' })
    ).toHaveAttribute('aria-pressed', 'true')
  })
})
