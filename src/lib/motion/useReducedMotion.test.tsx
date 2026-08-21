import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { shouldReduceMotion, useReducedMotion } from './useReducedMotion'

function fakeStorage(): Storage {
  const entries = new Map<string, string>()

  return {
    clear: () => entries.clear(),
    getItem: key => entries.get(key) ?? null,
    key: index => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size
    },
    removeItem: key => {
      entries.delete(key)
    },
    setItem: (key, value) => {
      entries.set(key, value)
    },
  }
}

let storage: Storage

function stubMediaQuery(matches: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    addEventListener: () => undefined,
    matches,
    removeEventListener: () => undefined,
  }))
}

function Probe() {
  const { reduced, toggle } = useReducedMotion()

  return (
    <>
      <span data-testid="state">{reduced ? 'reduced' : 'full'}</span>
      <button
        onClick={toggle}
        type="button"
      >
        toggle
      </button>
    </>
  )
}

function stateNow() {
  return screen.getByTestId('state').textContent
}

beforeEach(() => {
  storage = fakeStorage()
  vi.stubGlobal('localStorage', storage)
  stubMediaQuery(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useReducedMotion', () => {
  it('follows the operating system when nothing is stored', () => {
    // The OS setting has to work with no interaction at all.
    stubMediaQuery(true)
    render(<Probe />)

    expect(stateNow()).toBe('reduced')
  })

  it('allows motion when the system does not ask for less', () => {
    render(<Probe />)

    expect(stateNow()).toBe('full')
  })

  it('lets the page override the system setting in both directions', () => {
    // A learner may want animation off HERE without turning it off everywhere,
    // and equally may want it on here despite a system-wide preference.
    stubMediaQuery(true)

    const view = render(<Probe />)

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(stateNow()).toBe('full')

    view.unmount()
    stubMediaQuery(false)
    render(<Probe />)

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(stateNow()).toBe('reduced')
  })

  it('persists the override', () => {
    render(<Probe />)
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))

    expect(storage.getItem('efom-reduce-motion')).toBe('reduce')
  })

  it('survives storage being unavailable', () => {
    vi.stubGlobal('localStorage', {
      ...storage,
      getItem: () => {
        throw new Error('denied')
      },
    })
    stubMediaQuery(true)

    expect(() => render(<Probe />)).not.toThrow()
    expect(stateNow()).toBe('reduced')
  })
})

describe('shouldReduceMotion', () => {
  /**
   * `CreatureMotion` calls this BEFORE starting a sequence rather than
   * cancelling one afterwards, so a learner who asked for no motion never sees
   * the first frame.
   */
  it('agrees with the hook', () => {
    stubMediaQuery(true)
    expect(shouldReduceMotion()).toBe(true)

    stubMediaQuery(false)
    expect(shouldReduceMotion()).toBe(false)
  })

  it('honours a stored override over the system setting', () => {
    stubMediaQuery(false)
    storage.setItem('efom-reduce-motion', 'reduce')

    expect(shouldReduceMotion()).toBe(true)
  })
})
