import { DICTATION_LEVELS } from '@/modules/dictation/levels'
import type { DictationVideoStatus } from '@/modules/dictation/types'

/**
 * Client-side filter for the admin video list (`/admin/dictation?view=list`).
 * The page loads every manageable video once, so filtering, faceted counts
 * and sorting all run in memory. The filter round-trips through the URL so a
 * refresh or a shared link keeps it.
 */

export type AdminVideoSort =
  'order' | 'newest' | 'oldest' | 'title' | 'longest' | 'shortest'

/** The "none" value for level, topic and section facets. */
export const ADMIN_FILTER_NONE = 'none'

export const ADMIN_VIDEO_SORTS: Array<{
  value: AdminVideoSort
  label: string
}> = [
  { value: 'order', label: 'Custom order' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title', label: 'Title A-Z' },
  { value: 'longest', label: 'Longest' },
  { value: 'shortest', label: 'Shortest' },
]

/** Every status the list can show (archived videos live in the trash). */
export const ADMIN_VIDEO_STATUSES: DictationVideoStatus[] = [
  'ready',
  'transcriptReady',
  'segmenting',
  'needsTranscript',
  'draft',
  'failed',
]

export const ADMIN_LEVEL_OPTIONS = [
  ...DICTATION_LEVELS,
  ADMIN_FILTER_NONE,
] as const

export interface AdminVideoFilter {
  search: string
  /** CEFR levels, plus `none` for videos without one. Empty = any. */
  levels: string[]
  /** Empty = any. */
  statuses: DictationVideoStatus[]
  /** '' = any, `none` = no topic, otherwise a topic id. */
  topicId: string
  /** '' = any, `none` = no section, otherwise a section id. */
  sectionId: string
  sort: AdminVideoSort
}

export const EMPTY_ADMIN_VIDEO_FILTER: AdminVideoFilter = {
  search: '',
  levels: [],
  statuses: [],
  topicId: '',
  sectionId: '',
  sort: 'order',
}

export interface AdminFilterableVideo {
  title: string
  channelTitle: string | null
  level: string | null
  status: DictationVideoStatus
  topicId: string | null
  topicTitle: string | null
  sectionId: string | null
  sectionTitle: string | null
  /** Epoch milliseconds. */
  createdAt: number
  durationSeconds: number | null
}

/** Quick views: one tap replaces the facets (search and sort stay). */
export const ADMIN_QUICK_VIEWS: Array<{
  key: string
  label: string
  filter: Pick<AdminVideoFilter, 'levels' | 'statuses' | 'topicId'>
}> = [
  {
    key: 'unfiled',
    label: 'No topic',
    filter: { levels: [], statuses: [], topicId: ADMIN_FILTER_NONE },
  },
  {
    key: 'no-level',
    label: 'No level',
    filter: { levels: [ADMIN_FILTER_NONE], statuses: [], topicId: '' },
  },
  {
    key: 'not-ready',
    label: 'Not ready',
    filter: {
      levels: [],
      statuses: ADMIN_VIDEO_STATUSES.filter(status => status !== 'ready'),
      topicId: '',
    },
  },
]

const SORT_VALUES = ADMIN_VIDEO_SORTS.map(sort => sort.value)

function searchWords(search: string) {
  return search.toLowerCase().split(/\s+/).filter(Boolean)
}

function matchesFacet(selected: string[], value: string | null) {
  return !selected.length || selected.includes(value ?? ADMIN_FILTER_NONE)
}

function matchesPlacement(id: string, value: string | null) {
  if (!id) return true
  if (id === ADMIN_FILTER_NONE) return value === null

  return value === id
}

function matches(
  video: AdminFilterableVideo,
  filter: AdminVideoFilter,
  words: string[]
) {
  if (!matchesFacet(filter.levels, video.level)) return false
  if (!matchesFacet(filter.statuses, video.status)) return false
  if (!matchesPlacement(filter.topicId, video.topicId)) return false
  if (!matchesPlacement(filter.sectionId, video.sectionId)) return false
  if (!words.length) return true

  const haystack = [
    video.title,
    video.channelTitle,
    video.topicTitle,
    video.sectionTitle,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return words.every(word => haystack.includes(word))
}

/** Missing durations sort last either way. */
function byDuration(direction: 1 | -1) {
  return (a: AdminFilterableVideo, b: AdminFilterableVideo) => {
    if (a.durationSeconds === null) return b.durationSeconds === null ? 0 : 1
    if (b.durationSeconds === null) return -1

    return (a.durationSeconds - b.durationSeconds) * direction
  }
}

const COMPARE: Record<
  Exclude<AdminVideoSort, 'order'>,
  (a: AdminFilterableVideo, b: AdminFilterableVideo) => number
> = {
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  title: (a, b) => a.title.localeCompare(b.title),
  longest: byDuration(-1),
  shortest: byDuration(1),
}

/**
 * The videos that pass the filter, sorted. `order` keeps the input order
 * (the admin's drag order). Search needs every word to appear in the title,
 * channel, topic or section.
 */
export function filterAdminVideos<T extends AdminFilterableVideo>(
  videos: T[],
  filter: AdminVideoFilter
): T[] {
  const words = searchWords(filter.search)
  const visible = videos.filter(video => matches(video, filter, words))

  return filter.sort === 'order' ? visible : visible.sort(COMPARE[filter.sort])
}

function countBy<T extends AdminFilterableVideo>(
  videos: T[],
  filter: AdminVideoFilter,
  key: (video: T) => string | null
) {
  const counts: Record<string, number> = {}
  const words = searchWords(filter.search)

  for (const video of videos)
    if (matches(video, filter, words)) {
      const value = key(video) ?? ADMIN_FILTER_NONE

      counts[value] = (counts[value] ?? 0) + 1
    }

  return counts
}

export interface AdminVideoFacetCounts {
  levels: Record<string, number>
  statuses: Record<string, number>
  topics: Record<string, number>
  sections: Record<string, number>
}

/**
 * How many videos each option would show, given the rest of the filter
 * (each facet ignores its own selection, so picking B2 still shows the B1
 * count).
 */
export function countAdminVideoFacets(
  videos: AdminFilterableVideo[],
  filter: AdminVideoFilter
): AdminVideoFacetCounts {
  return {
    levels: countBy(videos, { ...filter, levels: [] }, video => video.level),
    statuses: countBy(
      videos,
      { ...filter, statuses: [] },
      video => video.status
    ),
    topics: countBy(
      videos,
      { ...filter, topicId: '', sectionId: '' },
      video => video.topicId
    ),
    sections: countBy(
      videos,
      { ...filter, sectionId: '' },
      video => video.sectionId
    ),
  }
}

/** Number of narrowing facets in use (sort is not one). */
export function countActiveAdminFilters(filter: AdminVideoFilter) {
  return (
    Number(Boolean(filter.search.trim())) +
    filter.levels.length +
    filter.statuses.length +
    Number(Boolean(filter.topicId)) +
    Number(Boolean(filter.sectionId))
  )
}

function list(params: URLSearchParams, key: string) {
  return (params.get(key) ?? '').split(',').filter(Boolean)
}

/** Read the filter from the URL, dropping anything unknown. */
export function parseAdminVideoFilter(
  params: URLSearchParams
): AdminVideoFilter {
  const sort = params.get('sort') as AdminVideoSort | null
  const topicId = params.get('topic') ?? ''

  return {
    search: (params.get('q') ?? '').slice(0, 100),
    levels: list(params, 'level').filter(level =>
      (ADMIN_LEVEL_OPTIONS as readonly string[]).includes(level)
    ),
    statuses: list(params, 'status').filter(
      (status): status is DictationVideoStatus =>
        (ADMIN_VIDEO_STATUSES as string[]).includes(status)
    ),
    topicId,
    // A section only means something inside a picked topic.
    sectionId:
      topicId && topicId !== ADMIN_FILTER_NONE
        ? (params.get('section') ?? '')
        : '',
    sort: sort && SORT_VALUES.includes(sort) ? sort : 'order',
  }
}

/**
 * Write the filter into `params` (other keys, like `view`, stay). Defaults
 * are left out so a clean list has a clean URL.
 */
export function writeAdminVideoFilter(
  params: URLSearchParams,
  filter: AdminVideoFilter
): URLSearchParams {
  const next = new URLSearchParams(params)
  const values: Record<string, string> = {
    q: filter.search.trim(),
    level: filter.levels.join(','),
    status: filter.statuses.join(','),
    topic: filter.topicId,
    section: filter.sectionId,
    sort: filter.sort === 'order' ? '' : filter.sort,
  }

  for (const [key, value] of Object.entries(values))
    if (value) next.set(key, value)
    else next.delete(key)

  return next
}
