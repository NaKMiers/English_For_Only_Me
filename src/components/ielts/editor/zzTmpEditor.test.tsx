import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { IELTS_SAMPLE_TEST } from '@/modules/ielts/fixtures/sampleTest'
import type { IeltsAdminTest } from '@/modules/ielts/tests/testService'

import { TestEditor } from './TestEditor'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

function make(status: string) {
  const sections = structuredClone(IELTS_SAMPLE_TEST.sections)
  sections[5].groups[0].questions[0].answers = []
  return {
    ...IELTS_SAMPLE_TEST,
    id: 'dev',
    status,
    sections,
    metaRevision: 1,
    plan: null,
    generationLog: Array.from({ length: 14 }, (_, i) => ({
      at: new Date(2026, 9, 1 + i).toISOString(),
      sectionKey: 'reading-1',
      kind: 'draft',
      model: 'x',
      inputTokens: 1,
      outputTokens: 2,
      durationMs: 1000,
      outcome: 'ok',
      failedRules: [],
      error: '',
    })),
  } as unknown as IeltsAdminTest
}

describe('editor smoke', () => {
  it('groups, tabs, questions, nav, dirty, checks jump', () => {
    render(<TestEditor initial={make('draft')} />)
    // open first group, switch tabs
    fireEvent.click(screen.getByText('Q1-6'))
    expect(screen.getByRole('button', { name: 'Setup' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    fireEvent.click(screen.getByRole('button', { name: /^Questions \(6\)$/ }))
    expect(screen.getByText('Q1')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Q1'))
    const prompt = screen.getAllByLabelText(/Accepted answers/)[0]
    fireEvent.change(prompt, { target: { value: 'abc' } })
    expect(screen.getAllByText('Unsaved').length).toBeGreaterThan(0)
    // next section
    fireEvent.click(screen.getByRole('button', { name: 'Next section' }))
    expect(
      screen.getByRole('heading', { name: /Listening 2/i })
    ).toBeInTheDocument()
    // checks dialog jump
    fireEvent.click(screen.getByRole('button', { name: /error/ }))
    const dialog = screen.getByRole('dialog')
    const jump = within(dialog)
      .getAllByRole('button')
      .find(b => /reading-2|answer/i.test(b.textContent ?? ''))
    expect(jump).toBeTruthy()
    fireEvent.click(jump!)
    expect(
      screen.getByRole('heading', { name: /Reading 2/i })
    ).toBeInTheDocument()
    // paragraph rows + section check disclosure visible
    expect(screen.getByText('Section check')).toBeInTheDocument()
    expect(screen.getByText('Passage')).toBeInTheDocument()
    // view switch
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.queryByRole('region', { name: 'Edit section' })).toBeNull()
  })

  it('published test stays editable and says edits go live', () => {
    render(<TestEditor initial={make('published')} />)
    expect(screen.getByRole('note')).toHaveTextContent('live')
    expect(
      screen.queryByRole('button', { name: /Edit as new draft/ })
    ).toBeNull()
    fireEvent.change(screen.getByLabelText('Section title'), {
      target: { value: 'Edited title' },
    })
    expect(screen.getByRole('button', { name: /^Save$/ })).toBeEnabled()
  })
})
