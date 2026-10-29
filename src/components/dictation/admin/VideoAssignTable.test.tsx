import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EMPTY_ADMIN_VIDEO_FILTER } from '@/modules/dictation/content/adminVideoFilter'

import { type AdminVideoRow, VideoAssignTable } from './VideoAssignTable'

vi.mock('@/modules/dictation/content/adminActions', () => ({
  assignVideosAction: vi.fn(),
  deleteVideoAction: vi.fn(),
  reorderVideosAction: vi.fn(),
  updateVideoLevelAction: vi.fn(),
}))

afterEach(cleanup)

function row(
  title: string,
  overrides: Partial<AdminVideoRow> = {}
): AdminVideoRow {
  return {
    id: title,
    title,
    channelTitle: null,
    level: null,
    topicId: null,
    topicTitle: null,
    sectionId: null,
    sectionTitle: null,
    status: 'ready',
    createdAt: 0,
    durationSeconds: null,
    thumbnailUrl: null,
    youtubeVideoId: null,
    order: 0,
    ...overrides,
  }
}

const videos = [
  row('Why cats purr', { level: 'B2', topicId: 't1', topicTitle: 'Science' }),
  row('How bridges stand', { level: 'C1', channelTitle: 'Engineering Hub' }),
  row('Ordering coffee', { status: 'needsTranscript' }),
]

function renderTable() {
  render(
    <VideoAssignTable
      initialFilter={EMPTY_ADMIN_VIDEO_FILTER}
      sections={[]}
      topics={[{ id: 't1', title: 'Science' }]}
      videos={videos}
    />
  )
}

const shownTitles = () =>
  screen
    .getAllByRole('button', { name: /^Reorder / })
    .map(grip => grip.getAttribute('aria-label')?.replace('Reorder ', ''))

describe('VideoAssignTable filters', () => {
  it('searches channel names and writes the filter into the URL', () => {
    renderTable()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search videos' }), {
      target: { value: 'hub' },
    })

    expect(shownTitles()).toEqual(['How bridges stand'])
    expect(screen.getByText('1 of 3 videos')).toBeInTheDocument()
    expect(window.location.search).toBe('?q=hub')

    fireEvent.click(screen.getByRole('button', { name: 'Remove filter “hub”' }))

    expect(shownTitles()).toHaveLength(3)
    expect(window.location.search).toBe('')
  })

  it('combines level chips with OR and shows each option count', () => {
    renderTable()
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))

    const levels = screen.getByRole('group', { name: 'Level' })

    fireEvent.click(within(levels).getByRole('button', { name: 'B2 (1)' }))
    fireEvent.click(
      within(levels).getByRole('button', { name: 'No level (1)' })
    )

    expect(shownTitles()).toEqual(['Why cats purr', 'Ordering coffee'])
    expect(
      screen.getByRole('button', { name: 'Filters, 2 active' })
    ).toBeInTheDocument()
  })

  it('applies a quick view and selects only what is shown', () => {
    renderTable()
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Not ready' }))

    expect(shownTitles()).toEqual(['Ordering coffee'])

    fireEvent.click(screen.getByRole('checkbox'))

    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Apply to 1' })
    ).toBeInTheDocument()
  })
})
