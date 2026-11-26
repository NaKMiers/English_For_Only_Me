import { describe, expect, it } from 'vitest'

import { splitSampleAnswer } from './sampleAnswer'

describe('splitSampleAnswer', () => {
  it('lifts a "# " first line as the title', () => {
    expect(splitSampleAnswer('# Airport plans\n\nFirst.\n\nSecond.')).toEqual({
      title: 'Airport plans',
      paragraphs: ['First.', 'Second.'],
    })
  })

  it('keeps every paragraph when there is no title', () => {
    expect(splitSampleAnswer('First.\n \nSecond.\n')).toEqual({
      title: '',
      paragraphs: ['First.', 'Second.'],
    })
  })
})
