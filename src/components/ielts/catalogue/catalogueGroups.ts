import type { IeltsTrack } from '@/modules/ielts/constants'

export const TRACK_LABELS: Record<IeltsTrack, string> = {
  academic: 'Academic',
  general: 'General',
}

interface GroupableEntry {
  /** Admin-set group name; empty falls back to the title rule below. */
  series?: string
  title: string
  track: IeltsTrack
}

export interface CatalogueGroup<T> {
  heading: string
  tests: Array<{ entry: T; label: string; number: number | null }>
}

const SERIES_TEST = /^(.+?)[\s·:-]+test\s*(\d+)$/i

/**
 * Group tests into books the way Cambridge-style sites list them. A test's
 * `series`, when the admin set one, is the heading as typed. Otherwise the
 * title decides: "IELTS 21 Test 1" and "IELTS 21 Test 2" sit under "IELTS 21
 * Academic". Either way a trailing "Test N" becomes the card label ("Test 1"),
 * and a title without one keeps its own name (under its track when there is
 * no series). Groups keep the catalogue's order; numbered tests sort 1, 2, 3.
 */
export function groupCatalogue<T extends GroupableEntry>(
  entries: T[]
): CatalogueGroup<T>[] {
  const groups = new Map<string, CatalogueGroup<T>>()

  for (const entry of entries) {
    const track = TRACK_LABELS[entry.track]
    const match = SERIES_TEST.exec(entry.title.trim())
    const named = entry.series?.trim()
    const series = match?.[1].trim()
    const heading = named
      ? named
      : series
        ? series.toLowerCase().includes(track.toLowerCase())
          ? series
          : `${series} ${track}`
        : `${track} tests`
    const label = match ? `Test ${match[2]}` : entry.title
    const group = groups.get(heading) ?? { heading, tests: [] }

    group.tests.push({
      entry,
      label,
      number: match ? Number(match[2]) : null,
    })
    groups.set(heading, group)
  }

  for (const group of groups.values())
    group.tests.sort(
      (left, right) => (left.number ?? Infinity) - (right.number ?? Infinity)
    )

  return [...groups.values()]
}
