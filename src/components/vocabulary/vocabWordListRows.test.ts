import { describe, expect, test } from 'vitest'

import type { VocabWordListRecord } from '@/modules/vocabulary/types'

import {
  buildVocabWordListHref,
  replaceWordListRow,
  restoreWordListRow,
} from './vocabWordListRows'

function makeWord(
  id: string,
  status: VocabWordListRecord['item']['status']
): VocabWordListRecord {
  return {
    entry: { id },
    item: { dueAt: null, id: `item-${id}`, status },
    sourceVideo: null,
  } as unknown as VocabWordListRecord
}

describe('word list rows', () => {
  test('a status change that leaves the view removes the row', () => {
    const rows = [makeWord('a', 'learning'), makeWord('b', 'learning')]

    expect(
      replaceWordListRow({
        next: makeWord('a', 'alreadyKnow'),
        rows,
        view: 'learning',
      }).map(row => row.entry.id)
    ).toEqual(['b'])
  })

  test('a status change inside the view replaces the row in place', () => {
    const rows = [makeWord('a', 'alreadyKnow'), makeWord('b', 'mastered')]
    const next = makeWord('a', 'alreadyKnow')

    expect(replaceWordListRow({ next, rows, view: 'knownTotal' })[0]).toBe(next)
  })

  test('a rollback puts the row back where it was', () => {
    const word = makeWord('b', 'learning')
    const rows = [makeWord('a', 'learning'), makeWord('c', 'learning')]

    expect(
      restoreWordListRow({ index: 1, rows, view: 'learning', word }).map(
        row => row.entry.id
      )
    ).toEqual(['a', 'b', 'c'])
  })

  test('a rollback drops a word whose restored state left the view', () => {
    const rows = [makeWord('a', 'learning'), makeWord('c', 'learning')]

    // Restoring to a saved "already know" state: not a Learning row any more.
    expect(
      restoreWordListRow({
        index: 1,
        rows,
        view: 'learning',
        word: makeWord('b', 'alreadyKnow'),
      }).map(row => row.entry.id)
    ).toEqual(['a', 'c'])
    expect(
      restoreWordListRow({
        index: 0,
        rows: [makeWord('b', 'learning'), ...rows],
        view: 'learning',
        word: makeWord('b', 'alreadyKnow'),
      }).map(row => row.entry.id)
    ).toEqual(['a', 'c'])
  })

  test('page links keep the view and page size', () => {
    expect(
      buildVocabWordListHref({ page: 1, perPage: 50, view: 'mastered' })
    ).toBe('/vocabulary/words?view=mastered&perPage=50')
    expect(
      buildVocabWordListHref({ page: 3, perPage: 20, view: 'learning' })
    ).toBe('/vocabulary/words?view=learning&page=3&perPage=20')
  })
})
