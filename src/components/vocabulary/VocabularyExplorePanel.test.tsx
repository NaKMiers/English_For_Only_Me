import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { VocabEntryWithUserStateRecord } from '@/modules/vocabulary/types'

import { VocabularyExplorePanel } from './VocabularyExplorePanel'

function word(id: string, term: string): VocabEntryWithUserStateRecord {
  const at = new Date('2026-11-26T00:00:00.000Z')

  return {
    entry: {
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
      localizedMeanings: [],
      normalizedTerm: term,
      partOfSpeech: null,
      phonetics: [],
      providerErrors: [],
      relatedWords: [],
      sourceAttributions: [],
      synonyms: [],
      term,
      updatedAt: at,
    },
    userItem: null,
  }
}

const entries = [word('1', 'shaft'), word('2', 'lid'), word('3', 'canal')]

function renderPanel(activeIndex: number) {
  const showExploreIndex = vi.fn()

  render(
    <>
      <input aria-label="Search" />
      <VocabularyExplorePanel
        activeIndex={activeIndex}
        decisions={{}}
        entries={entries}
        markEntry={() => {}}
        moveExplore={() => {}}
        showExploreIndex={showExploreIndex}
      />
    </>
  )

  return showExploreIndex
}

describe('VocabularyExplorePanel arrow keys', () => {
  beforeEach(() => {
    // jsdom has no layout: put every element inside the viewport.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 400,
      top: 100,
    } as DOMRect)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('moves to the next and previous word', () => {
    const showExploreIndex = renderPanel(1)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    expect(showExploreIndex.mock.calls).toEqual([[2], [1]])
  })

  it('counts every press made before the next render', () => {
    const showExploreIndex = renderPanel(0)

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true })
    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true })

    // The third press would pass the last word, so it is dropped.
    expect(showExploreIndex.mock.calls).toEqual([[1], [2]])
  })

  it('stops at both ends of the deck', () => {
    const first = renderPanel(0)

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(first).not.toHaveBeenCalled()
  })

  it('leaves the keys alone while typing or holding a modifier', () => {
    const showExploreIndex = renderPanel(1)
    const input = document.querySelector('input') as HTMLInputElement

    fireEvent.keyDown(input, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })

    expect(showExploreIndex).not.toHaveBeenCalled()
  })

  it('leaves the keys alone while a dialog is open', () => {
    const showExploreIndex = renderPanel(1)
    const dialog = document.createElement('div')

    dialog.setAttribute('role', 'dialog')
    document.body.append(dialog)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    dialog.remove()

    expect(showExploreIndex).not.toHaveBeenCalled()
  })

  it('does nothing when the panel is off screen', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: -10,
      top: -500,
    } as DOMRect)
    const showExploreIndex = renderPanel(1)

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(showExploreIndex).not.toHaveBeenCalled()
  })
})
