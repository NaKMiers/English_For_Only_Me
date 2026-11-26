import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { VocabEntryApiRecord } from '@/modules/vocabulary/types'

import { TestVocabDialog } from './TestVocabDialog'

const api = vi.hoisted(() => ({
  lookup: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  search: vi.fn(),
}))

vi.mock('@/requests/ieltsAdminApi', () => ({
  readIeltsTestVocabApi: api.read,
  saveIeltsTestVocabApi: api.save,
}))

vi.mock('@/requests/vocabularyApi', () => ({
  lookupVocabEntryApi: api.lookup,
  searchVocabApi: api.search,
}))

function entry(
  id: string,
  term: string,
  vi: string | null
): VocabEntryApiRecord {
  const at = new Date('2026-11-26T00:00:00.000Z')

  return {
    id,
    antonyms: [],
    audioUrls: [],
    createdAt: at,
    definitions: [],
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
    localizedMeanings: vi
      ? [
          {
            language: 'vi',
            license: null,
            meaning: vi,
            partOfSpeech: null,
            source: 'test',
          },
        ]
      : [],
    normalizedTerm: term,
    partOfSpeech: 'noun',
    phonetics: [],
    providerErrors: [],
    relatedWords: [],
    sourceAttributions: [],
    synonyms: [],
    term,
    updatedAt: at,
  }
}

const shaft = entry('a'.repeat(24), 'shaft', 'giếng đứng')
const lid = entry('b'.repeat(24), 'lid', 'nắp')
const canal = entry('c'.repeat(24), 'canal', null)

function renderDialog() {
  return render(
    <TestVocabDialog
      onOpenChange={() => {}}
      open
      testId="test-1"
    />
  )
}

describe('TestVocabDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.read.mockResolvedValue({ entries: [shaft, lid] })
    api.search.mockResolvedValue({ entries: [] })
    api.save.mockImplementation(async (_id: string, ids: string[]) => ({
      entries: ids.map(id => [shaft, lid, canal].find(item => item.id === id)),
    }))
  })

  it('loads the saved words in order and flags a missing meaning', async () => {
    api.read.mockResolvedValue({ entries: [shaft, canal] })
    renderDialog()

    expect(await screen.findByText('shaft')).toBeInTheDocument()
    expect(screen.getByText('In this test (2 words)')).toBeInTheDocument()
    expect(screen.getByText('No Vietnamese meaning yet')).toBeInTheDocument()
    expect(api.read).toHaveBeenCalledWith('test-1')
  })

  it('adds a searched word, reorders, and saves the ids in order', async () => {
    api.search.mockResolvedValue({
      entries: [{ entry: canal, userItem: null }],
    })
    renderDialog()
    await screen.findByText('shaft')

    fireEvent.change(screen.getByLabelText('Search words'), {
      target: { value: 'can' },
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Add canal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Move canal up' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove shaft' }))
    fireEvent.click(screen.getByRole('button', { name: /Save words/ }))

    await waitFor(() =>
      expect(api.save).toHaveBeenCalledWith('test-1', [canal.id, lid.id])
    )
  })

  it('does not add a word twice', async () => {
    api.search.mockResolvedValue({
      entries: [{ entry: shaft, userItem: null }],
    })
    renderDialog()
    await screen.findByText('In this test (2 words)')

    fireEvent.change(screen.getByLabelText('Search words'), {
      target: { value: 'sha' },
    })

    expect(
      await screen.findByRole('button', { name: 'shaft is already added' })
    ).toBeDisabled()
  })

  it('looks up a word the dictionary does not have yet', async () => {
    api.lookup.mockResolvedValue({ entry: canal, userItem: null })
    renderDialog()
    await screen.findByText('shaft')

    fireEvent.change(screen.getByLabelText('Search words'), {
      target: { value: 'canal' },
    })
    fireEvent.click(
      await screen.findByRole('button', { name: 'Look up "canal" and add' })
    )

    expect(
      await screen.findByText('In this test (3 words)')
    ).toBeInTheDocument()
    expect(api.lookup).toHaveBeenCalledWith({ term: 'canal' })
  })
})
