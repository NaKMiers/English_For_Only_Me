import { describe, expect, test } from 'vitest'

import { parseVocabWordListView } from './vocabWordListService'

describe('vocabWordListService', () => {
  test('parses supported list views', () => {
    expect(parseVocabWordListView('dueToday')).toBe('dueToday')
    expect(parseVocabWordListView('knownTotal')).toBe('knownTotal')
  })

  test('falls back to learning for unknown views', () => {
    expect(parseVocabWordListView(undefined)).toBe('learning')
    expect(parseVocabWordListView('nope')).toBe('learning')
  })
})
