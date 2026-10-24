import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createOutbox, type Outbox } from '@/lib/sync/outbox'
import type { VocabWordListRecord } from '@/modules/vocabulary/types'

import { VocabularyWordList } from './VocabularyWordList'

const mocks = vi.hoisted(() => ({
  outbox: { current: null as Outbox | null },
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}))

vi.mock('@/components/common/OutboxOwnerProvider', () => ({
  useClientOutbox: () => mocks.outbox.current,
}))

const NOW = new Date('2026-01-01T00:00:00.000Z')

function makeWord(id: string, term: string): VocabWordListRecord {
  return {
    entry: {
      definitions: [],
      enrichmentStatus: 'ready',
      frequencyRank: 1,
      id,
      localizedMeanings: [],
      phonetics: [],
      term,
    },
    item: {
      dueAt: NOW,
      id: `item-${id}`,
      knownAt: null,
      masteredAt: null,
      recallStage: 1,
      source: 'manual',
      status: 'learning',
    },
    sourceVideo: null,
  } as unknown as VocabWordListRecord
}

let responses: Array<(value: Response) => void>

describe('VocabularyWordList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    responses = []
    mocks.outbox.current = createOutbox({
      fetchImpl: (() =>
        new Promise<Response>(resolve => {
          responses.push(resolve)
        })) as unknown as typeof fetch,
      owner: 'test',
    })
  })

  test('moves a word out of the view at once and restores it on a 4xx', async () => {
    render(
      <VocabularyWordList
        activeView="learning"
        page={1}
        perPage={50}
        total={2}
        words={[makeWord('a', 'expect'), makeWord('b', 'turbulent')]}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: /Already Know/ })[0])

    expect(screen.queryByText('expect')).not.toBeInTheDocument()
    expect(screen.getByText('1 words in this view.')).toBeInTheDocument()

    await waitFor(() => expect(responses).toHaveLength(1))
    responses[0](
      new Response(JSON.stringify({ message: 'Could not save.' }), {
        status: 409,
      })
    )

    expect(await screen.findByText('Could not save.')).toBeInTheDocument()
    expect(screen.getByText('expect')).toBeInTheDocument()
    expect(screen.getByText('2 words in this view.')).toBeInTheDocument()
  })

  test('a rollback to a saved state puts the row back where it was', async () => {
    const known = makeWord('a', 'expect')
    const mastered = makeWord('b', 'turbulent')

    known.item = { ...known.item, status: 'alreadyKnow' }
    mastered.item = { ...mastered.item, status: 'mastered' }

    render(
      <VocabularyWordList
        activeView="knownTotal"
        page={1}
        perPage={50}
        total={2}
        words={[known, mastered]}
      />
    )

    // First press keeps the row in Known Total. While it is in flight, a
    // second press moves the row out of the view.
    fireEvent.click(screen.getAllByRole('button', { name: /Already Know/ })[1])
    await waitFor(() => expect(responses).toHaveLength(1))
    fireEvent.click(screen.getAllByRole('button', { name: /Should Learn/ })[1])
    expect(screen.queryByText('turbulent')).not.toBeInTheDocument()

    // The first press saves, then the second fails: roll back to the saved
    // state, in the row's original place.
    responses[0](
      new Response(
        JSON.stringify({ item: { ...mastered.item, status: 'alreadyKnow' } }),
        { status: 200 }
      )
    )
    await waitFor(() => expect(responses).toHaveLength(2))
    responses[1](
      new Response(JSON.stringify({ message: 'Could not save.' }), {
        status: 409,
      })
    )

    expect(await screen.findByText('Could not save.')).toBeInTheDocument()
    const terms = screen
      .getAllByText(/^(expect|turbulent)$/)
      .map(node => node.textContent)

    expect(terms).toEqual(['expect', 'turbulent'])
  })

  test('refills the page after a row leaves the view, so Next skips nothing', async () => {
    const props = {
      activeView: 'learning' as const,
      page: 1,
      perPage: 3,
    }
    const { rerender } = render(
      <VocabularyWordList
        {...props}
        total={6}
        words={[
          makeWord('a', 'expect'),
          makeWord('b', 'turbulent'),
          makeWord('c', 'ample'),
        ]}
      />
    )

    fireEvent.click(screen.getAllByRole('button', { name: /Already Know/ })[0])
    await waitFor(() => expect(responses).toHaveLength(1))
    expect(mocks.refresh).not.toHaveBeenCalled()
    responses[0](
      new Response(
        JSON.stringify({
          item: { ...makeWord('a', 'expect').item, status: 'alreadyKnow' },
        }),
        { status: 200 }
      )
    )

    // Once the write lands, the page re-reads the server list ...
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1))

    // ... which now starts one word later: "brisk" shifted up into page 1.
    rerender(
      <VocabularyWordList
        {...props}
        total={5}
        words={[
          makeWord('b', 'turbulent'),
          makeWord('c', 'ample'),
          makeWord('d', 'brisk'),
        ]}
      />
    )

    expect(screen.getByText('brisk')).toBeInTheDocument()
    expect(screen.queryByText('expect')).not.toBeInTheDocument()
    expect(screen.getByText('5 words in this view.')).toBeInTheDocument()
    expect(screen.getByText('1-3 / 5')).toBeInTheDocument()
  })

  test('pages through the server with page links', () => {
    render(
      <VocabularyWordList
        activeView="learning"
        page={1}
        perPage={1}
        total={2}
        words={[makeWord('a', 'expect')]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(mocks.push).toHaveBeenCalledWith(
      '/vocabulary/words?view=learning&page=2&perPage=1'
    )
  })
})
