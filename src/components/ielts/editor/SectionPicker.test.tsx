import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IELTS_SAMPLE_TEST } from '@/modules/ielts/fixtures/sampleTest'
import type { IeltsSection } from '@/modules/ielts/schema'

import { SectionPicker } from './SectionPicker'

function sections(): IeltsSection[] {
  return structuredClone(IELTS_SAMPLE_TEST.sections)
}

describe('SectionPicker', () => {
  it('groups parts by skill with a numbered tile each', () => {
    const all = sections()

    render(
      <SectionPicker
        dirtyKeys={[]}
        onSelect={() => undefined}
        sections={all}
      />
    )

    for (const skill of ['Listening', 'Reading', 'Writing']) {
      const group = screen.getByRole('region', { name: skill })
      const count = all.filter(item => item.skill === skill.toLowerCase())
      expect(within(group).getAllByRole('button')).toHaveLength(count.length)
    }
  })

  it('marks the selected part and selects on click', () => {
    const all = sections()
    const onSelect = vi.fn()
    const [first, second] = all

    render(
      <SectionPicker
        dirtyKeys={[second.key]}
        onSelect={onSelect}
        sections={all}
        selectedKey={first.key}
      />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
    expect(buttons[1].getAttribute('aria-label')).toMatch(/unsaved|chưa lưu/)

    fireEvent.click(buttons[1])
    expect(onSelect).toHaveBeenCalledWith(second.key)
  })
})
