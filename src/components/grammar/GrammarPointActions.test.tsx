import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OutboxOwnerProvider } from '@/components/common/OutboxOwnerProvider'
import type { UserGrammarItemApiRecord } from '@/modules/grammar/types'

import { GrammarPointActions } from './GrammarPointActions'

function serverItem(
  overrides: Partial<UserGrammarItemApiRecord>
): UserGrammarItemApiRecord {
  return {
    correctCount: 0,
    dueAt: null,
    lastReviewedAt: null,
    masteredAt: null,
    pointSlug: 'present-perfect',
    recallStage: 1,
    reviewCount: 0,
    status: 'learning',
    wrongCount: 0,
    ...overrides,
  }
}

/** Requests are answered by hand, in order, so the test controls timing. */
function deferredFetch() {
  const calls: {
    body: Record<string, unknown>
    respond: (status: number, data: unknown) => void
  }[] = []

  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>(resolve => {
          calls.push({
            body: JSON.parse(String(init?.body)) as Record<string, unknown>,
            respond: (status, data) =>
              resolve({
                json: () => Promise.resolve(data),
                ok: status < 400,
                status,
              } as unknown as Response),
          })
        })
    )
  )

  return calls
}

let ownerSeq = 0

function renderActions(initialItem: UserGrammarItemApiRecord | null) {
  ownerSeq += 1

  return render(
    <OutboxOwnerProvider ownerKey={`actions-owner-${ownerSeq}`}>
      <GrammarPointActions
        initialItem={initialItem}
        slug="present-perfect"
      />
    </OutboxOwnerProvider>
  )
}

describe('GrammarPointActions', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the predicted stage before the server answers', () => {
    const calls = deferredFetch()

    renderActions(null)

    fireEvent.click(screen.getByRole('button', { name: 'Start learning' }))

    expect(screen.getByText(/Learning - stage 1\/7/)).toBeTruthy()
    expect(calls).toHaveLength(1)
    expect(calls[0].body).toEqual({
      slug: 'present-perfect',
      status: 'learning',
    })
  })

  it('takes the server row when it lands', async () => {
    const calls = deferredFetch()

    renderActions(null)

    fireEvent.click(screen.getByRole('button', { name: 'Already know this' }))

    expect(screen.getByText(/Marked as already known - saving/)).toBeTruthy()

    await act(async () =>
      calls[0].respond(200, { item: serverItem({ status: 'alreadyKnow' }) })
    )

    await waitFor(() =>
      expect(screen.getByText('Marked as already known')).toBeTruthy()
    )
  })

  it('rolls back to the confirmed state on a rejected write', async () => {
    const calls = deferredFetch()

    renderActions(
      serverItem({ dueAt: '2026-10-30T00:00:00.000Z', recallStage: 4 })
    )

    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(screen.getByText(/Skipped for now/)).toBeTruthy()

    await act(async () =>
      calls[0].respond(404, { message: 'Grammar point not found.' })
    )

    await waitFor(() =>
      expect(screen.getByText('Grammar point not found.')).toBeTruthy()
    )
    expect(screen.getByText('Learning - stage 4/7')).toBeTruthy()
  })

  it('lets the last click win when clicks race', async () => {
    const calls = deferredFetch()

    renderActions(null)

    fireEvent.click(screen.getByRole('button', { name: 'Start learning' }))
    fireEvent.click(screen.getByRole('button', { name: 'Already know this' }))
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))

    expect(screen.getByText(/Skipped for now/)).toBeTruthy()

    // The first write was already in flight; the middle one merged away.
    await act(async () =>
      calls[0].respond(200, { item: serverItem({ status: 'learning' }) })
    )

    await waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1].body.status).toBe('ignored')
    expect(screen.getByText(/Skipped for now/)).toBeTruthy()

    await act(async () =>
      calls[1].respond(200, { item: serverItem({ status: 'ignored' }) })
    )

    await waitFor(() =>
      expect(screen.getByText('Skipped for now')).toBeTruthy()
    )
  })
})
