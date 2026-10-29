import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SkillLauncher } from './SkillLauncher'

function renderLauncher(mockBlockedReason: string | null = null) {
  return render(
    <SkillLauncher
      fullMeta={{ mock: '60 min', practice: 'All 3 passages' }}
      latest={null}
      mockBlockedReason={mockBlockedReason}
      parts={[1, 2, 3].map(part => ({
        label: `Passage ${part}`,
        meta: '20 min',
        part,
      }))}
      partsNoun="3 passages"
      skill="reading"
      slug="t"
      title="Reading"
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

  it('allows only the full test in mock mode', () => {
    renderLauncher()

    fireEvent.click(screen.getByRole('radio', { name: /Passage 2/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Mock' }))

    expect(screen.getByRole('radio', { name: /Passage 2/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Full test/ })).toBeChecked()
    expect(goHref()).toBe('/ielts/t/reading/mock')
  })

  it('disables Go in mock mode when the test cannot start', () => {
    renderLauncher('Needs audio.')

    fireEvent.click(screen.getByRole('button', { name: 'Mock' }))

    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled()
    expect(screen.getByText('Needs audio.')).toBeTruthy()
  })
})
