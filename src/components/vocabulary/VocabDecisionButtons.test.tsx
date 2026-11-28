import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { decisionOf, VocabDecisionButtons } from './VocabDecisionButtons'

describe('VocabDecisionButtons', () => {
  test('the saved pick is pressed, the other is not', () => {
    render(
      <VocabDecisionButtons
        decision="alreadyKnow"
        onDecide={() => {}}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Already Know' })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Should Learn' })
    ).toHaveAttribute('aria-pressed', 'false')
  })

  test('clicking the current pick is a no-op, the other one decides', () => {
    const onDecide = vi.fn()

    render(
      <VocabDecisionButtons
        decision="shouldLearn"
        onDecide={onDecide}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Should Learn' }))
    expect(onDecide).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Already Know' }))
    expect(onDecide).toHaveBeenCalledWith('alreadyKnow')
  })

  test('an error renders under the buttons as a danger notice', () => {
    const { container } = render(
      <VocabDecisionButtons
        decision={null}
        error="Could not save"
        onDecide={() => {}}
      />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Could not save')
    expect(alert.className).toMatch(/text-danger/)
    expect(alert.querySelector('svg')).not.toBeNull()
    // After the buttons, inside the same block.
    const block = container.querySelector('[data-vocab-decision]')
    expect(block?.lastElementChild).toBe(alert)
  })

  test('decisionOf maps saved statuses to a pick', () => {
    expect(decisionOf('learning')).toBe('shouldLearn')
    expect(decisionOf('mastered')).toBe('alreadyKnow')
    expect(decisionOf('alreadyKnow')).toBe('alreadyKnow')
    expect(decisionOf('ignored')).toBeNull()
    expect(decisionOf(undefined)).toBeNull()
  })
})
