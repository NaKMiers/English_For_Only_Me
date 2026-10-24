import { describe, expect, it } from 'vitest'

import { mergeExploreEntries } from '@/components/vocabulary/VocabularyDashboard'
import type { VocabEntryWithUserStateRecord } from '@/modules/vocabulary/types'

function card(id: string, userItem: unknown = null) {
  return { entry: { id }, userItem } as unknown as VocabEntryWithUserStateRecord
}

describe('mergeExploreEntries', () => {
  it('keeps dealt cards (and their local state) and appends only new ones', () => {
    const marked = card('a', { status: 'learning' })
    const merged = mergeExploreEntries(
      [marked, card('b')],
      [card('a'), card('b'), card('c'), card('d')]
    )

    expect(merged.map(item => item.entry.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(merged[0]).toBe(marked)
  })
})
