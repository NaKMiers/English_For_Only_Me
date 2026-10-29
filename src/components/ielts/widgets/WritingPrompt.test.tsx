import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { WritingPrompt } from './WritingPrompt'

afterEach(cleanup)

const PROMPT = [
  'You should spend about 40 minutes on this task.',
  '',
  '> The best way to provide enough homes is to build tall blocks.',
  '>',
  '> To what extent do you agree or disagree with this statement?',
  '',
  'Write at least 250 words.',
].join('\n')

describe('WritingPrompt', () => {
  it('boxes the task statement and leaves the instructions plain', () => {
    render(<WritingPrompt text={PROMPT} />)

    const statement = screen.getByText(/build tall blocks/)
    const question = screen.getByText(/agree or disagree/)
    const box = statement.parentElement!

    expect(question.parentElement).toBe(box)
    expect(box.className).toContain('border-2')
    expect(box.className).toContain('italic')
    expect(statement.textContent).not.toContain('>')

    for (const plain of [/40 minutes/, /at least 250 words/])
      expect(screen.getByText(plain).parentElement!.className).not.toContain(
        'border-2'
      )
  })
})
