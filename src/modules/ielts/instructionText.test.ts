import { describe, expect, it } from 'vitest'

import { formatInstruction } from './instructionText'

const render = (instruction: string) =>
  formatInstruction(instruction).map(line =>
    line.map(part => (part.bold ? `**${part.text}**` : part.text)).join('')
  )

describe('formatInstruction', () => {
  it('puts each sentence on its own line and bolds the word limit', () => {
    expect(
      render('Complete the notes below. Write ONE WORD ONLY for each answer.')
    ).toEqual([
      'Complete the notes below.',
      'Write **ONE WORD ONLY** for each answer.',
    ])
  })

  it('keeps AND/OR A NUMBER inside one bold run', () => {
    expect(
      render(
        'Complete the table. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.'
      )
    ).toEqual([
      'Complete the table.',
      'Write **NO MORE THAN TWO WORDS AND/OR A NUMBER** for each answer.',
    ])
  })

  it('leaves single answer letters plain', () => {
    expect(render('Choose TWO letters, A-E.')).toEqual([
      'Choose **TWO** letters, A-E.',
    ])
    expect(render('Choose the correct letter, A, B or C.')).toEqual([
      'Choose the correct letter, A, B or C.',
    ])
  })
})
