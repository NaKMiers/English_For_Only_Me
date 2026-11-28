import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { createDictationDebriefApi } from '@/requests/dictationDebriefsApi'

import { DictationDebriefPanel } from './DictationDebriefPanel'

vi.mock('@/requests/dictationDebriefsApi', () => ({
  createDictationDebriefApi: vi.fn(),
}))

const createDebriefMock = createDictationDebriefApi as ReturnType<typeof vi.fn>

afterEach(() => {
  vi.clearAllMocks()
})

describe('DictationDebriefPanel', () => {
  test('a failed generate shows the error under the button, panel closed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    createDebriefMock.mockRejectedValueOnce(new Error('provider down'))

    render(
      <DictationDebriefPanel
        canGenerate
        videoId="507f1f77bcf86cd799439011"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Generate Debrief' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toBeVisible()
    expect(alert.textContent).toContain('AI debrief is unavailable right now.')
    // The fold stayed closed: the error is not inside it.
    expect(screen.queryByText(/appears only after video completion/)).toBeNull()
  })

  test('before the video is done: one quiet line, no disabled button', async () => {
    const { container } = render(
      <DictationDebriefPanel
        canGenerate={false}
        videoId="507f1f77bcf86cd799439011"
      />
    )

    expect(
      screen.getByText(
        'Complete this video before asking the AI coach for a debrief.'
      )
    ).toBeVisible()
    await waitFor(() => {
      expect(container.querySelector('button:disabled')).toBeNull()
    })
    expect(
      screen.queryByRole('button', { name: 'Generate Debrief' })
    ).toBeNull()
  })
})
