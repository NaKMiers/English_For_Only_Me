import { describe, expect, test } from 'vitest'

import { parseNgslStatsCsv } from './seedVocabulary'

describe('seed vocabulary parser', () => {
  test('parses ranked NGSL rows and skips malformed rows', () => {
    const csv = [
      'Lemma,SFI Rank,SFI,Adjusted Frequency per Million (U)',
      'the,1,87.85,60910',
      'be,2,86.86,48575',
      'bad123,3,10,1',
      'look up,4,9,1',
    ].join('\n')

    expect(parseNgslStatsCsv(csv, 10)).toEqual([
      { rank: 1, term: 'the' },
      { rank: 2, term: 'be' },
      { rank: 4, term: 'look up' },
    ])
  })

  test('honors the requested limit', () => {
    const csv = [
      'Lemma,SFI Rank,SFI,Adjusted Frequency per Million (U)',
      'the,1,87.85,60910',
      'be,2,86.86,48575',
    ].join('\n')

    expect(parseNgslStatsCsv(csv, 1)).toEqual([{ rank: 1, term: 'the' }])
  })
})
