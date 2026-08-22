import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GrammarRecallTaskRecord } from '@/modules/grammar/types'

import { GrammarRecallModal } from './GrammarRecallModal'

/**
 * No `setupDom()` here, deliberately.
 *
 * It swaps `globalThis.document` for a second JSDOM, which leaves `screen`
 * bound to the first one - so every query finds an empty body. Tests that call
 * it use the render result's scoped queries instead. This file uses the
 * vitest jsdom environment directly, the same way `useGrammarSfx.test.tsx`
 * does, so `screen` works. Cleanup is already registered in `src/test/setup.ts`.
 */

/**
 * `next/image` resolves its src against the document URL, which is
 * `about:blank` under the test environment, so the real component throws before
 * this test can reach the behaviour it is about. The sensei portrait is not
 * what is under test here; the request body is.
 */
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    <span data-testid="next-image">{String(props.alt ?? '')}</span>
  ),
}))

/**
 * `setupDom` builds a bare JSDOM, and `useReducedMotion` reads `matchMedia`
 * during render. Motion off keeps the assertions about request bodies free of
 * animation timing.
 */
function stubMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: () => ({
      addEventListener: () => undefined,
      matches: false,
      removeEventListener: () => undefined,
    }),
  })
}

function task(
  overrides: Partial<GrammarRecallTaskRecord> = {}
): GrammarRecallTaskRecord {
  return {
    cefrLevel: 'A2',
    choices: [
      'There is a few water in the glass.',
      'There is a little water in the glass.',
      'There are a few water in the glass.',
    ],
    complexity: 2,
    drillId: 'd1',
    family: 'nouns-quantifiers',
    idempotencyKey: 'key-1',
    kind: 'choice',
    l1Risk: 'high',
    l1RiskObserved: null,
    pointSlug: 'a-few-a-little',
    pointTitle: 'A Few And A Little',
    prompt: 'Choose the correct sentence.',
    recallStage: 1,
    reviewStatus: 'unverified',
    ...overrides,
  }
}

/**
 * Capture what the component actually POSTs.
 *
 * The bug this file exists for was invisible from the outside: the UI showed a
 * plausible "wrong" verdict, and only the request body revealed that the
 * learner's choice never left the browser. So the assertion is on the payload,
 * not on the rendered result.
 */
function mockFetch() {
  const bodies: Record<string, unknown>[] = []
  const fetcher = vi.fn((_url: string, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)

    return Promise.resolve({
      json: () =>
        Promise.resolve({
          correction: null,
          explanation: 'Water is uncountable.',
          isCorrect: true,
          item: {
            correctCount: 1,
            dueAt: null,
            lastReviewedAt: null,
            masteredAt: null,
            pointSlug: 'a-few-a-little',
            recallStage: 2,
            reviewCount: 1,
            status: 'learning',
            wrongCount: 0,
          },
          matchedAnswer: 'There is a little water in the glass.',
          verdict: 'correct',
        }),
      ok: true,
    } as unknown as Response)
  })

  vi.stubGlobal('fetch', fetcher)

  return { bodies, fetcher }
}

describe('GrammarRecallModal', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    stubMatchMedia()
  })

  /**
   * REGRESSION GUARD - DO NOT DELETE.
   *
   * The choice handler used to do this:
   *
   *     onClick={() => { setAnswer(choice); void submit(false) }}
   *
   * `submit` read `answer` from the render that created the handler, and
   * `setAnswer` does not change that value synchronously - so the FIRST click on
   * any multiple-choice drill posted the PREVIOUS answer, which is '' on a fresh
   * drill. The server graded an empty string, returned wrong, and the panel
   * printed the target as "Expected" - so the learner saw the exact sentence
   * they had just clicked, next to the word wrong.
   *
   * Every choice drill in the recall loop was ungradeable this way. The
   * assertion is on the request body because that is where the bug lived; the
   * rendered verdict looked entirely reasonable.
   */
  it('posts the clicked choice, not the previous answer state', async () => {
    const { bodies } = mockFetch()

    render(
      <GrammarRecallModal
        onClose={() => {}}
        tasks={[task()]}
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'There is a little water in the glass.',
      })
    )

    await waitFor(() => expect(bodies).toHaveLength(1))

    expect(bodies[0].answer).toBe('There is a little water in the glass.')
  })

  it('posts each choice correctly across consecutive drills', async () => {
    // `next()` resets the answer to '', so a stale closure would break drill 2
    // exactly as it broke drill 1. This pins both.
    const { bodies } = mockFetch()

    render(
      <GrammarRecallModal
        onClose={() => {}}
        tasks={[task(), task({ drillId: 'd2', idempotencyKey: 'key-2' })]}
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'There is a few water in the glass.' })
    )

    await waitFor(() => expect(bodies).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: 'Next Drill' }))

    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'There are a few water in the glass.',
        })
      ).toBeTruthy()
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'There are a few water in the glass.',
      })
    )

    await waitFor(() => expect(bodies).toHaveLength(2))

    expect(bodies[0].answer).toBe('There is a few water in the glass.')
    expect(bodies[1].answer).toBe('There are a few water in the glass.')
  })

  it('posts what was typed on a production drill', async () => {
    const { bodies } = mockFetch()

    render(
      <GrammarRecallModal
        onClose={() => {}}
        tasks={[task({ choices: null, kind: 'transform' })]}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('Type your answer'), {
      target: { value: 'He has lived here' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Check' }))

    await waitFor(() => expect(bodies).toHaveLength(1))

    expect(bodies[0].answer).toBe('He has lived here')
  })

  it('sends an empty answer when the learner reveals', async () => {
    // Reveal is the one path where an empty answer is correct: the learner is
    // asking for the answer, not offering one.
    const { bodies } = mockFetch()

    render(
      <GrammarRecallModal
        onClose={() => {}}
        tasks={[task({ choices: null, kind: 'transform' })]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }))

    await waitFor(() => expect(bodies).toHaveLength(1))

    expect(bodies[0].answer).toBe('')
    expect(bodies[0].revealed).toBe(true)
  })
})
