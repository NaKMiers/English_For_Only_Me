import { describe, expect, it } from 'vitest'

import { contextReadAloud } from './listeningContext'

const line = (speaker: string, text: string) => ({ speaker, text })

describe('contextReadAloud', () => {
  it('is false without a context', () => {
    expect(
      contextReadAloud({ context: '', lines: [line('Announcer', 'Part 1.')] })
    ).toBe(false)
  })

  it('matches a line that holds the context, ignoring punctuation', () => {
    expect(
      contextReadAloud({
        context: 'Part 1, you will hear a woman phoning.',
        lines: [line('Speaker', 'Part 1. You will hear a woman phoning')],
      })
    ).toBe(true)
  })

  it('matches an announcer line that introduces the part in other words', () => {
    expect(
      contextReadAloud({
        context: 'Part 2, you will hear a recruitment officer giving a talk.',
        lines: [
          line(
            'Announcer',
            'Part 2, you will hear a recruitment officer called Megan Baker, giving a talk'
          ),
          line('Megan Baker', 'Hello, everyone.'),
        ],
      })
    ).toBe(true)
  })

  it('keeps the context when nobody reads it', () => {
    expect(
      contextReadAloud({
        context: 'You will hear a tour guide.',
        lines: [line('Guide', 'Welcome to the museum.')],
      })
    ).toBe(false)
  })
})
