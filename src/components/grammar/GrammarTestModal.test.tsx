import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GrammarTestQuestionApiRecord } from '@/modules/grammar/test/types'

import { GrammarTestModal } from './GrammarTestModal'

/**
 * See `GrammarRecallModal.test.tsx` for why `setupDom` is avoided and
 * `next/image` is mocked.
 */
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    <span data-testid="next-image">{String(props.alt ?? '')}</span>
  ),
}))

function question(
  overrides: Partial<GrammarTestQuestionApiRecord> = {}
): GrammarTestQuestionApiRecord {
  return {
    cefrLevel: 'A2',
    choices: [
      'There is a few water in the glass.',
      'There is a little water in the glass.',
    ],
    generated: true,
    id: 'q1',
    kind: 'choice',
    l1Risk: 'high',
    pointSlug: 'a-few-a-little',
    pointTitle: 'A Few And A Little',
    prompt: 'Choose the correct sentence.',
    reviewStatus: 'unverified',
    ...overrides,
  }
}

function mockFetch() {
  const bodies: Record<string, unknown>[] = []
  const fetcher = vi.fn((_url: string, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)

    return Promise.resolve({
      json: () =>
        Promise.resolve({
          correct: 1,
          knockedBack: [],
          notice: null,
          outcomes: [],
          total: 1,
        }),
      ok: true,
    } as unknown as Response)
  })

  vi.stubGlobal('fetch', fetcher)

  return { bodies }
}

describe('GrammarTestModal', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  /**
   * The sibling of the recall bug, pinned before it can happen here.
   *
   * This modal is built so the failure is structurally impossible - answers are
   * held in a map keyed by question id and only read when Submit is pressed, a
   * separate event with a render in between - but "structurally impossible" is
   * what the recall modal looked like too, right up until every choice drill in
   * the module turned out to be ungradeable.
   */
  it('submits the clicked choice, not an empty answer', async () => {
    const { bodies } = mockFetch()

    render(
      <GrammarTestModal
        notice={null}
        onClose={() => {}}
        questions={[question()]}
        sessionId="6a8919fb4a0b89e1718fce71"
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'There is a little water in the glass.',
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Submit Test' }))

    await waitFor(() => expect(bodies).toHaveLength(1))

    expect(bodies[0].answers).toEqual([
      { answer: 'There is a little water in the glass.', questionId: 'q1' },
    ])
  })

  it('keeps each answer with its own question across the run', async () => {
    const { bodies } = mockFetch()

    render(
      <GrammarTestModal
        notice={null}
        onClose={() => {}}
        questions={[
          question(),
          question({
            choices: ['Yes, there are.', 'Yes, there is.'],
            id: 'q2',
            pointSlug: 'there-is-there-are',
            pointTitle: 'There Is And There Are',
          }),
        ]}
        sessionId="6a8919fb4a0b89e1718fce71"
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'There is a little water in the glass.',
      })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Yes, there is.' })
      ).toBeTruthy()
    )

    fireEvent.click(screen.getByRole('button', { name: 'Yes, there is.' }))
    fireEvent.click(screen.getByRole('button', { name: 'Submit Test' }))

    await waitFor(() => expect(bodies).toHaveLength(1))

    expect(bodies[0].answers).toEqual([
      { answer: 'There is a little water in the glass.', questionId: 'q1' },
      { answer: 'Yes, there is.', questionId: 'q2' },
    ])
  })

  it('lets an answer be changed before submitting', async () => {
    // Nothing is graded until Submit, so the last click on a question wins.
    const { bodies } = mockFetch()

    render(
      <GrammarTestModal
        notice={null}
        onClose={() => {}}
        questions={[question()]}
        sessionId="6a8919fb4a0b89e1718fce71"
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'There is a little water in the glass.',
      })
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'There is a few water in the glass.' })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Submit Test' }))

    await waitFor(() => expect(bodies).toHaveLength(1))

    expect(bodies[0].answers).toEqual([
      { answer: 'There is a few water in the glass.', questionId: 'q1' },
    ])
  })

  it('submits unanswered questions as empty rather than dropping them', async () => {
    const { bodies } = mockFetch()

    render(
      <GrammarTestModal
        notice={null}
        onClose={() => {}}
        questions={[question(), question({ id: 'q2' })]}
        sessionId="6a8919fb4a0b89e1718fce71"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Submit Test' })).toBeTruthy()
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit Test' }))

    await waitFor(() => expect(bodies).toHaveLength(1))

    expect(bodies[0].answers).toEqual([
      { answer: '', questionId: 'q1' },
      { answer: '', questionId: 'q2' },
    ])
  })
})
