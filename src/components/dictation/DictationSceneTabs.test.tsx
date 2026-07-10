import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import type { DictationVideoApiRecord } from '@/modules/dictation/types'
import { setupDom } from '@/test/setupDom'

import { DictationSceneTabs } from './DictationSceneTabs'

setupDom()

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

describe('DictationSceneTabs', () => {
  const importedVideo: DictationVideoApiRecord = {
    activeTranscriptId: 'transcript-one',
    channelTitle: 'TED-Ed',
    collections: [],
    topicId: null,
    sectionId: null,
    level: null,
    completedSessionCount: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    defaultLanguage: 'en',
    durationSeconds: 300,
    id: 'video-one',
    importStatus: 'metadataReady',
    importWarning: null,
    lastPracticedAt: null,
    order: 0,
    purpose: 'ielts-listening',
    sentenceCount: 40,
    sourceType: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=abc123abc12',
    status: 'inProgress',
    tags: [],
    thumbnailUrl: 'https://i.ytimg.com/vi/abc123abc12/hqdefault.jpg',
    title: 'How to study effectively',
    transcriptStatus: 'manualAdded',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    youtubeUrl: 'https://www.youtube.com/watch?v=abc123abc12',
    youtubeVideoId: 'abc123abc12',
  }
  const missingTranscriptVideo: DictationVideoApiRecord = {
    ...importedVideo,
    activeTranscriptId: null,
    id: 'video-two',
    sentenceCount: 0,
    status: 'needsTranscript',
    title: 'Needs transcript video',
    transcriptStatus: 'manualNeeded',
  }

  test('switches between Dictation scenes', () => {
    const view = render(<DictationSceneTabs />)

    expect(
      view.getByRole('heading', {
        name: 'Choose a video. Turn it into practice.',
      })
    ).not.toBeNull()
    expect(view.getByRole('link', { name: 'Browse Videos' })).not.toBeNull()

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

  test('renders imported video statuses as user-facing labels', () => {
    const view = render(<DictationSceneTabs videos={[importedVideo]} />)

    expect(view.getByText('40 sentences - In Progress')).not.toBeNull()
    expect(view.getByText('In Progress')).not.toBeNull()
    expect(view.container.textContent).not.toContain('inProgress')
  })

  test('routes missing-transcript cards to transcript editing', () => {
    const view = render(
      <DictationSceneTabs videos={[missingTranscriptVideo]} />
    )

    expect(view.getByRole('link', { name: 'Add Transcript' })).not.toBeNull()
    expect(view.queryByRole('link', { name: 'Open Results' })).toBeNull()
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
