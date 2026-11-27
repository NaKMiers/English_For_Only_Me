import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ContinueFloat } from './ContinueFloat'

function rect(top: number, height = 40): DOMRect {
  return {
    bottom: top + height,
    height,
    left: 0,
    right: 100,
    toJSON: () => ({}),
    top,
    width: 100,
    x: 0,
    y: top,
  }
}

function place(id: string, top: number | null) {
  const element = document.createElement('div')
  element.id = id
  element.getBoundingClientRect = () => rect(top ?? 0, top === null ? 0 : 40)
  element.scrollIntoView = vi.fn()
  document.body.append(element)
  return element
}

function renderFloat(props: Partial<Parameters<typeof ContinueFloat>[0]> = {}) {
  const result = render(
    <ContinueFloat
      label="Continue"
      targetId="here"
      {...props}
    />
  )
  flushFrames()
  return result
}

// Frames run when the test flushes them, like a browser between events.
let frames: FrameRequestCallback[] = []

function flushFrames() {
  act(() => {
    const pending = frames
    frames = []
    for (const callback of pending) callback(0)
  })
}

beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  vi.stubGlobal(
    'matchMedia',
    () => ({ matches: false }) as unknown as MediaQueryList
  )
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: 800,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('ContinueFloat', () => {
  test('hidden while the target is in view', () => {
    place('here', 300)
    renderFloat()

    expect(screen.queryByRole('button')).toBeNull()
  })

  test('points down when the target is below, and up when above', () => {
    const target = place('here', 2000)
    const { container } = renderFloat()

    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    expect(container.querySelector('.lucide-arrow-down')).not.toBeNull()

    target.getBoundingClientRect = () => rect(-900)
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    flushFrames()
    expect(container.querySelector('.lucide-arrow-up')).not.toBeNull()
  })

  test('hidden while the next stop card is in view', () => {
    place('here', 2000)
    place('next-stop', 100)
    renderFloat()

    expect(screen.queryByRole('button')).toBeNull()
  })

  test('calls onBeforeJump before scrolling to the target', () => {
    const target = place('here', 2000)
    const calls: string[] = []
    target.scrollIntoView = vi.fn(() => calls.push('scroll'))
    renderFloat({ onBeforeJump: () => calls.push('before') })

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    flushFrames()
    expect(calls).toEqual(['before', 'scroll'])
  })

  test('uses the fallback while the target is folded, nothing when missing', () => {
    place('here', null)
    place('unit-2', 1500)
    const { unmount } = renderFloat({ fallbackId: 'unit-2' })

    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    unmount()
    document.body.innerHTML = ''

    renderFloat({ targetId: 'missing' })
    expect(screen.queryByRole('button')).toBeNull()
  })
})
