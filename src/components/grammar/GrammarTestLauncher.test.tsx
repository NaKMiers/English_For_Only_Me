import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GrammarTestLauncher } from './GrammarTestLauncher'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    <span data-testid="next-image">{String(props.alt ?? '')}</span>
  ),
}))

const loaded = vi.hoisted(() => ({ config: 0, test: 0 }))
const refresh = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

/**
 * The modals are lazy chunks. Counting module evaluation shows the dashboard
 * does not pull them in until the learner heads for a test.
 */
vi.mock('./GrammarTestConfigModal', () => {
  loaded.config += 1

  return {
    GrammarTestConfigModal: ({
      onCancel,
      onStart,
    }: {
      onCancel: () => void
      onStart: (config: unknown) => void
    }) => (
      <div>
        <button
          onClick={onCancel}
          type="button"
        >
          Cancel config
        </button>
        <button
          onClick={() => onStart({})}
          type="button"
        >
          Start test
        </button>
      </div>
    ),
  }
})

vi.mock('./GrammarTestModal', () => {
  loaded.test += 1

  return {
    GrammarTestModal: ({ onClose }: { onClose: () => void }) => (
      <button
        onClick={onClose}
        type="button"
      >
        Close test
      </button>
    ),
  }
})

describe('GrammarTestLauncher lazy modals', () => {
  it('loads the config modal only once the learner heads for it', async () => {
    render(<GrammarTestLauncher untouchedCount={3} />)

    expect(loaded.config).toBe(0)
    expect(loaded.test).toBe(0)

    fireEvent.click(screen.getByRole('button', { name: 'Test Me' }))

    expect(
      await screen.findByRole('button', { name: 'Cancel config' })
    ).toBeTruthy()
    expect(loaded.config).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel config' }))

    expect(screen.getByRole('button', { name: 'Test Me' })).toBeTruthy()
  })
})

describe('GrammarTestLauncher page data', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    refresh.mockClear()
  })

  it('re-reads the page data after a test, not after a cancelled config', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ notice: null, questions: [], sessionId: 's1' }),
            { status: 200 }
          )
        )
      )
    )
    render(<GrammarTestLauncher untouchedCount={3} />)

    fireEvent.click(screen.getByRole('button', { name: 'Test Me' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Cancel config' })
    )
    expect(refresh).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Test Me' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Start test' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Close test' }))

    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
