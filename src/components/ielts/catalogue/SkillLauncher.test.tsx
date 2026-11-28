import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { TestLaunchers } from './SkillLauncher'

function launcher(
  skill: 'reading' | 'writing',
  mockBlockedReason: string | null = null
) {
  return {
    fullMeta: { mock: '60 min', practice: 'All 3 passages' },
    latest: null,
    mockBlockedReason,
    parts: [1, 2, 3].map(part => ({ label: `Passage ${part}`, part })),
    partsNoun: '3 passages',
    skill,
    slug: 't',
    title: skill === 'reading' ? 'Reading' : 'Writing',
  }
}

function renderLauncher(mockBlockedReason: string | null = null) {
  return render(
    <TestLaunchers
      skills={[
        {
          fullMeta: { mock: '60 min', practice: 'All 3 passages' },
          latest: null,
          mockBlockedReason,
          parts: [1, 2, 3].map(part => ({ label: `Passage ${part}`, part })),
          partsNoun: '3 passages',
          skill: 'reading',
          slug: 't',
          title: 'Reading',
        },
      ]}
    />
  )
}

const goHref = () =>
  screen.getByRole('link', { name: 'Go' }).getAttribute('href')

describe('SkillLauncher', () => {
  it('practises the full test by default and a chosen part after picking it', () => {
    renderLauncher()

    expect(goHref()).toBe('/ielts/t/reading')

    fireEvent.click(screen.getByRole('radio', { name: /Passage 2/ }))

    expect(goHref()).toBe('/ielts/t/reading?part=2')
  })

  it('hides the parts in mock mode, leaving only the full test', () => {
    renderLauncher()

    fireEvent.click(screen.getByRole('radio', { name: /Passage 2/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Mock' }))

    expect(screen.queryByRole('radio', { name: /Passage 2/ })).toBeNull()
    expect(screen.getByRole('radio', { name: /Full test/ })).toBeChecked()
    expect(goHref()).toBe('/ielts/t/reading/mock')
  })

  it('a mock that cannot start shows only why: no options, no disabled Go', () => {
    renderLauncher('Needs audio.')

    fireEvent.click(screen.getByRole('button', { name: 'Mock' }))

    expect(screen.queryByRole('button', { name: 'Go' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Go' })).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getByText('Needs audio.')).toBeTruthy()
  })

  it('the next skill wears the ring and the one ink Go', () => {
    const { container } = render(
      <TestLaunchers
        nextSkill="writing"
        skills={[launcher('reading'), launcher('writing')]}
      />
    )

    const ink = [...container.querySelectorAll('[class]')].filter(element =>
      /(^|\s)bg-cta(\s|$)/.test(element.getAttribute('class') ?? '')
    )
    // The radio dots use cta too: count the Go links only.
    const inkGo = ink.filter(element => element.tagName === 'A')
    expect(inkGo).toHaveLength(1)
    expect(
      inkGo[0].closest('[data-next-skill]')?.getAttribute('aria-label')
    ).toBe('Writing')
  })

  it('no ink Go when every skill has a band', () => {
    const { container } = render(
      <TestLaunchers
        nextSkill={null}
        skills={[launcher('reading'), launcher('writing')]}
      />
    )

    expect(container.querySelector('[data-next-skill]')).toBeNull()
    expect(
      [...container.querySelectorAll('a')].filter(element =>
        /(^|\s)bg-cta(\s|$)/.test(element.getAttribute('class') ?? '')
      )
    ).toHaveLength(0)
  })

  it('every skill is open, with no fold to press', () => {
    renderLauncher()

    expect(screen.getByRole('radio', { name: /Passage 1/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: /^Reading/ })).toBeNull()
  })

  it('one mode switch for the test, minutes only on the full test', () => {
    renderLauncher()

    expect(
      screen.getByRole('group', { name: 'Practice or mock for this test' })
    ).toBeInTheDocument()
    expect(screen.queryByText('20 min')).toBeNull()
    expect(screen.getByText('All 3 passages')).toBeInTheDocument()
  })
})
