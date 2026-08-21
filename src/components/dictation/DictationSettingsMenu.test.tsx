import { fireEvent, render, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import { setupDom } from '@/test/setupDom'

import { DictationSettingsMenu } from './DictationSettingsMenu'

setupDom()

function renderMenu(
  overrides: Partial<Parameters<typeof DictationSettingsMenu>[0]> = {}
) {
  const props = {
    answerTextSize: 'large' as const,
    onAnswerTextSizeChange: vi.fn(),
    onPlaybackSpeedChange: vi.fn(),
    onVideoSizeChange: vi.fn(),
    playbackSpeed: 1,
    videoSize: 'normal' as const,
    ...overrides,
  }

  return { props, view: render(<DictationSettingsMenu {...props} />) }
}

describe('DictationSettingsMenu', () => {
  // Regression: the group labels used to sit next to their radio groups rather
  // than inside them, and base-ui's Menu.GroupLabel throws without the group
  // context - so opening the menu blew up the whole practice screen.
  test('opens without throwing and lists every preference group', async () => {
    const { view } = renderMenu()

    fireEvent.click(
      view.getByRole('button', { name: 'Playback and display settings' })
    )

    await waitFor(() => {
      expect(view.getByText('Speed')).not.toBeNull()
    })
    expect(view.getByText('Answer text')).not.toBeNull()
    expect(view.getByText('Video size')).not.toBeNull()
    expect(view.getByRole('menuitemradio', { name: '1.25x' })).not.toBeNull()
  })

  test('reports the picked speed, text size, and video size', async () => {
    const { props, view } = renderMenu()

    fireEvent.click(
      view.getByRole('button', { name: 'Playback and display settings' })
    )

    await waitFor(() => {
      expect(view.getByRole('menuitemradio', { name: '0.75x' })).not.toBeNull()
    })

    fireEvent.click(view.getByRole('menuitemradio', { name: '0.75x' }))
    fireEvent.click(view.getByRole('menuitemradio', { name: 'Extra large' }))
    fireEvent.click(view.getByRole('menuitemradio', { name: 'Max' }))

    expect(props.onPlaybackSpeedChange).toHaveBeenCalledWith(0.75)
    expect(props.onAnswerTextSizeChange).toHaveBeenCalledWith('xlarge')
    expect(props.onVideoSizeChange).toHaveBeenCalledWith('max')
  })
})
