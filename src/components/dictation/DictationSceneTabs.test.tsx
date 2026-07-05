import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import { setupDom } from '@/test/setupDom'

import { DictationSceneTabs } from './DictationSceneTabs'

setupDom()

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('DictationSceneTabs', () => {
  test('switches between Dictation scenes', () => {
    const view = render(<DictationSceneTabs />)

    expect(
      view.getByRole('heading', {
        name: 'Choose a video. Turn it into practice.',
      })
    ).not.toBeNull()

    fireEvent.click(view.getByRole('tab', { name: 'Practice' }))

    expect(
      view.getByRole('heading', { name: 'Listen. Type. Check. Retry.' })
    ).not.toBeNull()

    fireEvent.click(view.getByRole('tab', { name: 'Stats' }))

    expect(
      view.getByRole('heading', { name: 'Make the weak spots loud.' })
    ).not.toBeNull()

    fireEvent.click(view.getByRole('tab', { name: 'Review' }))

    expect(
      view.getByRole('heading', {
        name: 'One mistake becomes the next drill.',
      })
    ).not.toBeNull()
  })

  test('renders Library fields and preserves local typed values', () => {
    const view = render(<DictationSceneTabs />)

    const youtubeUrl = view.getByLabelText('YouTube URL')
    const transcriptSource = view.getByLabelText('Transcript source')

    fireEvent.change(youtubeUrl, {
      target: { value: 'https://youtube.com/watch?v=my-ielts-video' },
    })
    fireEvent.change(transcriptSource, {
      target: { value: 'Manual transcript for a private IELTS video.' },
    })

    expect((youtubeUrl as HTMLInputElement).value).toBe(
      'https://youtube.com/watch?v=my-ielts-video'
    )
    expect((transcriptSource as HTMLTextAreaElement).value).toBe(
      'Manual transcript for a private IELTS video.'
    )
  })

  test('renders reachable Practice textarea and controls', () => {
    const view = render(<DictationSceneTabs />)

    fireEvent.click(view.getByRole('tab', { name: 'Practice' }))

    const answer = view.getByLabelText('Sentence answer')
    const check = view.getByRole('button', { name: 'Check' })
    const reveal = view.getByRole('button', { name: 'Reveal' })
    const skip = view.getByRole('button', { name: 'Skip' })

    answer.focus()
    expect(document.activeElement).toBe(answer)

    check.focus()
    expect(document.activeElement).toBe(check)
    expect((reveal as HTMLButtonElement).disabled).toBe(false)
    expect((skip as HTMLButtonElement).disabled).toBe(false)
  })
})
