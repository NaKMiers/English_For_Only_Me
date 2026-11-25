import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AudioPlayer } from './AudioPlayer'

function press(code: string, init: KeyboardEventInit = { altKey: true }) {
  fireEvent.keyDown(window, { code, ...init })
}

describe('AudioPlayer shortcuts', () => {
  it('seeks with Alt+L and Alt+J when shortcuts are on', () => {
    render(
      <AudioPlayer
        durationSec={120}
        shortcuts
        src="/a.mp3"
      />
    )

    press('KeyL')
    press('KeyL')
    expect(screen.getByText('0:10')).toBeTruthy()

    press('KeyJ')
    expect(screen.getByText('0:05')).toBeTruthy()
  })

  it('plays and pauses with Alt+K', () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)

    render(
      <AudioPlayer
        durationSec={120}
        shortcuts
        src="/a.mp3"
      />
    )

    press('KeyK')
    expect(play).toHaveBeenCalledOnce()
    expect(
      screen.getByRole('button', { name: 'Play' }).getAttribute('title')
    ).toBe('Play (Alt+K)')

    play.mockRestore()
  })

  it('ignores the keys without Alt, or when shortcuts are off', () => {
    const { rerender } = render(
      <AudioPlayer
        durationSec={120}
        shortcuts
        src="/a.mp3"
      />
    )

    press('KeyL', {})
    expect(screen.getByText('0:00')).toBeTruthy()

    rerender(
      <AudioPlayer
        durationSec={120}
        src="/a.mp3"
      />
    )
    press('KeyL')
    expect(screen.getByText('0:00')).toBeTruthy()
  })
})
