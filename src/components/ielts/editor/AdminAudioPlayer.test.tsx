import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AdminAudioPlayer } from './AdminAudioPlayer'

const LINES = [
  { speaker: 'Anna', voice: 'a', text: 'Hello, bike workshop.' },
  { speaker: 'Tom', voice: 'b', text: 'Hi, I would like to enrol.' },
]

function renderPlayer(lineOffsetsSec: number[]) {
  return render(
    <AdminAudioPlayer
      audio={{ url: '/a.mp3', publicId: 'a', durationSec: 413, lineOffsetsSec }}
      lines={LINES}
    />
  )
}

describe('AdminAudioPlayer', () => {
  it('steps by line and captions the speaker when the audio is timed', () => {
    renderPlayer([0, 3.2])

    expect(screen.getByText('0:00')).toBeTruthy()
    expect(screen.getByText(/6:53/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Next line' }))

    expect(screen.getByText('Tom')).toBeTruthy()
    expect(screen.getByText('2/2')).toBeTruthy()
  })

  it('falls back to 10 second skips for an uploaded mp3', () => {
    renderPlayer([])

    fireEvent.click(screen.getByRole('button', { name: 'Forward 10 seconds' }))

    expect(screen.getByText('0:10')).toBeTruthy()
  })

  it('cycles the playback speed', () => {
    renderPlayer([])

    const speed = screen.getByRole('button', { name: 'Playback speed 1x' })
    fireEvent.click(speed)

    expect(speed.getAttribute('aria-label')).toBe('Playback speed 1.25x')
  })
})
