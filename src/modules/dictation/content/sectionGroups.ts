import type {
  BrowseSectionGroup,
  BrowseVideoItem,
} from '@/components/dictation/browse/SectionAccordion'

export interface GroupableVideo extends BrowseVideoItem {
  sectionId: string | null
}

export interface GroupableSection {
  id: string
  title: string
}

const UNGROUPED_KEY = 'ungrouped'

/**
 * Group a topic's videos into its sections (in the given order), appending an
 * "Ungrouped" group for videos with no section - but only when such videos
 * exist. Empty sections are still shown (an admin made them on purpose). Pure so
 * the grouping is unit-tested without a DB.
 */
export function buildSectionGroups(
  sections: ReadonlyArray<GroupableSection>,
  videos: ReadonlyArray<GroupableVideo>
): BrowseSectionGroup[] {
  const bySection = new Map<string, BrowseVideoItem[]>()
  const ungrouped: BrowseVideoItem[] = []

  for (const video of videos) {
    const { sectionId, ...item } = video

    if (sectionId) {
      const bucket = bySection.get(sectionId) ?? []
      bucket.push(item)
      bySection.set(sectionId, bucket)
    } else ungrouped.push(item)
  }

  const groups: BrowseSectionGroup[] = sections.map(section => ({
    key: section.id,
    title: section.title,
    videos: bySection.get(section.id) ?? [],
  }))

  if (ungrouped.length > 0)
    groups.push({ key: UNGROUPED_KEY, title: 'Ungrouped', videos: ungrouped })

  return groups
}
