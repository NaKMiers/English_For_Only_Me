import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { RunnerToolbar, ToolbarToggle } from './RunnerToolbar'

vi.mock('@/components/common/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggle: vi.fn() }),
}))

function renderToolbar(
  props: Partial<Parameters<typeof RunnerToolbar>[0]> = {}
) {
  const onSubmit = vi.fn()

  render(
    <RunnerToolbar
      backHref="/ielts/t"
      modeLabel="Practice"
      onSubmit={onSubmit}
      saveState="saved"
      secondsLeft={null}
      submitDisabled={false}
      submitting={false}
      title="Reading Passage 1"
      {...props}
    />
  )

  return { onSubmit }
}

// Characterisation of the exam header before its chrome changes (T2A).
describe('RunnerToolbar', () => {
  test('shows the title, a way back and Submit, which submits', () => {
    const { onSubmit } = renderToolbar()

    expect(screen.getByText('Reading Passage 1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /leave/i })).toHaveAttribute(
      'href',
      '/ielts/t'
    )
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  test('Submit is the one cta and carries no brand override', () => {
    renderToolbar()

    const submit = screen.getByRole('button', { name: /submit/i })
    expect(submit.className).toContain('bg-cta')
    expect(submit.className).not.toContain('bg-brand')
  })

  test('Submit is disabled while submitting', () => {
    renderToolbar({ submitting: true })

    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
  })

  test('a toggle that is on uses cta, never ink', () => {
    render(
      <ToolbarToggle
        checked
        icon={<span />}
        label="Guided"
        onCheckedChange={vi.fn()}
      />
    )

    const toggle = screen.getByRole('button', { name: 'Guided' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle.className).toContain('bg-cta')
    expect(toggle.className).not.toContain('bg-ink')
  })
})
