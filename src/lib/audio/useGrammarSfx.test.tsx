import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GRAMMAR_SFX_STORAGE_KEY } from './grammarSfx'
import { useGrammarSfx } from './useGrammarSfx'

/** Minimal AudioContext stand-in: records what the hook does to it. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = []

  closed = false
  destination = {}
  resumeCount = 0
  startedSources = 0
  state: AudioContextState = 'running'

  constructor() {
    FakeAudioContext.instances.push(this)
  }

  close() {
    this.closed = true

    return Promise.resolve()
  }

  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length)

    return { getChannelData: () => data }
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => undefined,
      start: () => {
        this.startedSources += 1
      },
    }
  }

  resume() {
    this.resumeCount += 1
    this.state = 'running'

    return Promise.resolve()
  }
}

/**
 * Drives the hook through real clicks rather than by capturing its return value.
 *
 * Not just to satisfy the lint rule: the whole behaviour under test is that the
 * AudioContext is minted INSIDE a user gesture, so exercising it through actual
 * click handlers is the only version of this test that proves the thing that
 * matters.
 */
function Probe() {
  const { enabled, play, toggle } = useGrammarSfx()

  return (
    <>
      <span data-testid="state">{enabled ? 'on' : 'off'}</span>
      <button
        onClick={toggle}
        type="button"
      >
        toggle
      </button>
      {(['correct', 'wrong', 'revive', 'pageTurn'] as const).map(sting => (
        <button
          key={sting}
          onClick={() => play(sting)}
          type="button"
        >
          {sting}
        </button>
      ))}
    </>
  )
}

function press(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }))
}

function stateNow() {
  return screen.getByTestId('state').textContent
}

/**
 * This jsdom build ships without `localStorage` (Node needs
 * `--localstorage-file`), so the test provides one. The hook already survives
 * its absence - every access is wrapped - which is what the last case here
 * checks.
 */
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

beforeEach(() => {
  FakeAudioContext.instances = []
  storage = fakeStorage()
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('AudioContext', FakeAudioContext)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useGrammarSfx', () => {
  it('is muted before anyone asks for sound', () => {
    // Audio arriving unrequested on a study page is a reason to close the tab.
    render(<Probe />)

    expect(stateNow()).toBe('off')
  })

  it('creates no AudioContext until sound is enabled', () => {
    render(<Probe />)
    press('correct')

    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  /**
   * The constraint that shapes this whole hook. Autoplay policy blocks a
   * context created in the callback of an awaited fetch - which is exactly where
   * a drill result arrives. Minting it in the toggle click is the only reliable
   * moment, and getting this wrong works in development and fails silently in
   * production.
   */
  it('creates the context inside the toggle, not at first play', () => {
    render(<Probe />)
    press('toggle')

    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].resumeCount).toBeGreaterThan(0)
    expect(stateNow()).toBe('on')
  })

  it('plays a sting once enabled', () => {
    render(<Probe />)
    press('toggle')
    press('correct')

    expect(FakeAudioContext.instances[0].startedSources).toBe(1)
  })

  it('plays nothing after being switched back off', () => {
    render(<Probe />)
    press('toggle')
    press('toggle')
    press('wrong')

    expect(stateNow()).toBe('off')
    expect(FakeAudioContext.instances[0].startedSources).toBe(0)
  })

  it('resumes a context the browser suspended between gestures', () => {
    render(<Probe />)
    press('toggle')

    const context = FakeAudioContext.instances[0]
    const before = context.resumeCount

    context.state = 'suspended'
    press('revive')

    expect(context.resumeCount).toBeGreaterThan(before)
  })

  it('reuses one context across many plays', () => {
    // Browsers cap how many contexts a page may create.
    render(<Probe />)
    press('toggle')
    press('correct')
    press('wrong')
    press('pageTurn')

    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].startedSources).toBe(3)
  })

  it('closes the context on unmount', () => {
    // An abandoned context holds an audio thread open.
    const view = render(<Probe />)

    press('toggle')
    view.unmount()

    expect(FakeAudioContext.instances[0].closed).toBe(true)
  })

  describe('the persisted preference', () => {
    it('restores an enabled preference', () => {
      storage.setItem(GRAMMAR_SFX_STORAGE_KEY, 'on')
      render(<Probe />)

      expect(stateNow()).toBe('on')
    })

    it('stays muted for any other stored value', () => {
      storage.setItem(GRAMMAR_SFX_STORAGE_KEY, 'yes-please')
      render(<Probe />)

      expect(stateNow()).toBe('off')
    })

    it('writes the preference on toggle', () => {
      render(<Probe />)
      press('toggle')

      expect(storage.getItem(GRAMMAR_SFX_STORAGE_KEY)).toBe('on')
    })

    it('survives storage being unavailable', () => {
      // Private browsing, or storage disabled by policy.
      vi.stubGlobal('localStorage', {
        ...storage,
        getItem: () => {
          throw new Error('denied')
        },
      })

      expect(() => render(<Probe />)).not.toThrow()
      expect(stateNow()).toBe('off')
    })
  })
})
