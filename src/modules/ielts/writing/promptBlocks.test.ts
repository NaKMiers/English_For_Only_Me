import { describe, expect, it } from 'vitest'

import { parseWritingPrompt, plainWritingPrompt } from './promptBlocks'

const PROMPT = [
  'You should spend about 40 minutes on this task.',
  '',
  'Write about the following topic:',
  '',
  '> The best way to provide enough homes in large cities is to build tall apartment blocks.',
  '>',
  '> To what extent do you agree or disagree with this statement?',
  '',
  'Write at least 250 words.',
].join('\n')

describe('parseWritingPrompt', () => {
  it('puts quoted paragraphs in one box between plain paragraphs', () => {
    expect(parseWritingPrompt(PROMPT)).toEqual([
      {
        boxed: false,
        paragraphs: [
          'You should spend about 40 minutes on this task.',
          'Write about the following topic:',
        ],
      },
      {
        boxed: true,
        paragraphs: [
          'The best way to provide enough homes in large cities is to build tall apartment blocks.',
          'To what extent do you agree or disagree with this statement?',
        ],
      },
      { boxed: false, paragraphs: ['Write at least 250 words.'] },
    ])
  })

  it('also joins boxed paragraphs separated by a blank line', () => {
    expect(parseWritingPrompt('> One.\n\n> Two.')).toEqual([
      { boxed: true, paragraphs: ['One.', 'Two.'] },
    ])
  })

  it('keeps line breaks inside a paragraph and splits on a box change', () => {
    expect(parseWritingPrompt('Dear Sir,\nI am writing\n> Task line')).toEqual([
      { boxed: false, paragraphs: ['Dear Sir,\nI am writing'] },
      { boxed: true, paragraphs: ['Task line'] },
    ])
  })

  it('reads a prompt without markers as plain paragraphs', () => {
    expect(parseWritingPrompt('First.\r\n\r\nSecond.')).toEqual([
      { boxed: false, paragraphs: ['First.', 'Second.'] },
    ])
    expect(parseWritingPrompt('  \n')).toEqual([])
  })
})

describe('plainWritingPrompt', () => {
  it('drops the box markers', () => {
    expect(plainWritingPrompt(PROMPT)).toBe(
      [
        'You should spend about 40 minutes on this task.',
        'Write about the following topic:',
        'The best way to provide enough homes in large cities is to build tall apartment blocks.',
        'To what extent do you agree or disagree with this statement?',
        'Write at least 250 words.',
      ].join('\n\n')
    )
  })
})
