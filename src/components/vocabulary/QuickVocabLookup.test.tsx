import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import type {
  UserVocabItemApiRecord,
  VocabEntryWithUserStateRecord,
} from '@/modules/vocabulary/types'

import { QuickVocabDialog } from './QuickVocabLookup'

vi.mock('@/components/common/OutboxOwnerProvider', () => ({
  useClientOutbox: () => null,
  useOutboxOwnerKey: () => null,
}))

const at = new Date('2026-11-28T00:00:00.000Z')

function word(
  status: UserVocabItemApiRecord['status'] | null
): VocabEntryWithUserStateRecord {
  return {
    entry: {
      id: 'e1',
      antonyms: [],
      audioUrls: [],
      createdAt: at,
      definitions: [
        { definition: 'A place where ships shelter.', partOfSpeech: 'noun' },
      ],
      difficultyLevel: null,
      enrichmentAttempts: 0,
      enrichmentStatus: 'ready',
      entryType: 'word',
      examples: [],
      frequencyRank: null,
      language: 'en',
      lastEnrichedAt: null,
      lemma: null,
      license: null,
      localizedMeanings: [{ language: 'vi', meaning: 'bến cảng' }],
      normalizedTerm: 'harbour',
      partOfSpeech: 'noun',
      phonetics: [],
      providerErrors: [],
      relatedWords: [],
      sourceAttributions: [],
      synonyms: [],
      term: 'harbour',
      updatedAt: at,
    },
    userItem: status ? ({ status } as unknown as UserVocabItemApiRecord) : null,
  } as unknown as VocabEntryWithUserStateRecord
}

describe('QuickVocabDialog', () => {
  test('shows the saved pick from the learner item', () => {
    render(
      <QuickVocabDialog
        entry={word('learning')}
        onMark={() => {}}
        onOpenChange={() => {}}
        open
      />
    )

    expect(
      screen.getByRole('button', { name: 'Should Learn' })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: 'Already Know' })
    ).toHaveAttribute('aria-pressed', 'false')
  })

  test('compact: the meaning is a chip, the definition plain text', () => {
    render(
      <QuickVocabDialog
        entry={word(null)}
        onMark={() => {}}
        onOpenChange={() => {}}
        open
      />
    )

    expect(screen.getByText('bến cảng').className).toMatch(/bg-pastel-mint/)
    expect(screen.getByText('A place where ships shelter.').className).toMatch(
      /text-sm/
    )
  })

  test('a failed mark shows its error under the buttons; picking calls onMark', () => {
    const onMark = vi.fn()

    render(
      <QuickVocabDialog
        entry={word(null)}
        error="Could not save"
        onMark={onMark}
        onOpenChange={() => {}}
        open
      />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Could not save')
    fireEvent.click(screen.getByRole('button', { name: 'Already Know' }))
    expect(onMark).toHaveBeenCalledWith('alreadyKnow')
  })
})
