import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LESSON_SFX_STORAGE_KEY, LESSON_STINGS } from './lessonSfx'
import { useLessonSfx } from './useLessonSfx'

/** Minimal AudioContext stand-in: records what the hook does to it. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = []

  /** The state the next context starts in. */
  static initialState: AudioContextState = 'running'

  closed = false
  currentTime = 0
  destination = {}
  resumeCount = 0
  startedSources = 0
  state: AudioContextState = FakeAudioContext.initialState

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
  const { enabled, play, toggle } = useLessonSfx()

  return (
    <>
      <span data-testid="state">{enabled ? 'on' : 'off'}</span>
      <button
        onClick={toggle}
        type="button"
      >
        toggle
      </button>
      {(['correct', 'wrong', 'combo', 'complete'] as const).map(sting => (
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

const notes = (sting: keyof typeof LESSON_STINGS) => LESSON_STINGS[sting].length

beforeEach(() => {
  FakeAudioContext.instances = []
  FakeAudioContext.initialState = 'running'
  storage = fakeStorage()
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('AudioContext', FakeAudioContext)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLessonSfx', () => {
  it('is on before anyone touches the toggle', () => {
    // Hearing right and wrong is part of the feedback.
    render(<Probe />)

    expect(stateNow()).toBe('on')
  })

  it('creates no AudioContext until the first sound', () => {
    render(<Probe />)

    expect(FakeAudioContext.instances).toHaveLength(0)

    press('correct')

    expect(FakeAudioContext.instances).toHaveLength(1)
  })

  it('plays every note of a sting', () => {
    render(<Probe />)
    press('correct')

    expect(FakeAudioContext.instances[0].startedSources).toBe(notes('correct'))
  })

  it('plays nothing once muted', () => {
    render(<Probe />)
    press('toggle')
    press('wrong')

    expect(stateNow()).toBe('off')
    expect(FakeAudioContext.instances).toHaveLength(0)
  })

  /**
   * The constraint that shapes this whole hook. Autoplay policy blocks a
   * context created in the callback of an awaited fetch - which is exactly
   * where a saved result arrives. Unmuting mints it inside the click.
   */
  it('creates the context inside the unmute click', () => {
    storage.setItem(LESSON_SFX_STORAGE_KEY, 'off')
    render(<Probe />)
    press('toggle')

    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].resumeCount).toBeGreaterThan(0)
    expect(stateNow()).toBe('on')
  })

  it('plays the first sting once a context that started suspended resumes', async () => {
    // Without waiting for resume(), a lesson's first sound would be silent.
    FakeAudioContext.initialState = 'suspended'
    render(<Probe />)
    press('correct')

    const context = FakeAudioContext.instances[0]

    expect(context.resumeCount).toBe(1)
    await waitFor(() => expect(context.startedSources).toBe(notes('correct')))
  })

  it('resumes a context the browser suspended between gestures', async () => {
    render(<Probe />)
    press('correct')

    const context = FakeAudioContext.instances[0]

    context.state = 'suspended'
    press('combo')

    expect(context.resumeCount).toBe(1)
    await waitFor(() =>
      expect(context.startedSources).toBe(notes('correct') + notes('combo'))
    )
  })

  it('reuses one context across many plays', () => {
    // Browsers cap how many contexts a page may create.
    render(<Probe />)
    press('correct')
    press('wrong')
    press('complete')

    expect(FakeAudioContext.instances).toHaveLength(1)
    expect(FakeAudioContext.instances[0].startedSources).toBe(
      notes('correct') + notes('wrong') + notes('complete')
    )
  })

  it('closes the context on unmount', () => {
    // An abandoned context holds an audio thread open.
    const view = render(<Probe />)

    press('correct')
    view.unmount()

    expect(FakeAudioContext.instances[0].closed).toBe(true)
  })

  describe('the persisted preference', () => {
    it('restores a muted preference', () => {
      storage.setItem(LESSON_SFX_STORAGE_KEY, 'off')
      render(<Probe />)

      expect(stateNow()).toBe('off')
    })

    it('stays on for any other stored value', () => {
      storage.setItem(LESSON_SFX_STORAGE_KEY, 'on')
      render(<Probe />)

      expect(stateNow()).toBe('on')
    })

    it('writes the preference on toggle', () => {
      render(<Probe />)
      press('toggle')

      expect(storage.getItem(LESSON_SFX_STORAGE_KEY)).toBe('off')

      press('toggle')

      expect(storage.getItem(LESSON_SFX_STORAGE_KEY)).toBe('on')
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
      expect(stateNow()).toBe('on')
    })
  })
})
