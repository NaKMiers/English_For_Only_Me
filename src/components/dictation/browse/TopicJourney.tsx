import { Progress } from '@/components/ui/progress'
import { MODULE_ICONS } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { pickNextStop } from '@/lib/journey/nextStop'
import { cn } from '@/lib/utils'

import {
  sectionPanelId,
  type BrowseSectionGroup,
  type BrowseVideoItem,
} from './SectionAccordion'
import { RecordDisc } from './RecordShelves'
import { TopicContinueFloat } from './TopicContinueFloat'
import { getTopicTileImageUrl } from './topicThumbnailUrl'

export interface TopicNextVideo {
  /** The section that holds it, opened by default below. */
  groupKey: string
  resume: boolean
  video: BrowseVideoItem
}

/**
 * The topic's next stop, in course order: a video left half done, else the
 * first video not finished yet. Null when every playable video is done.
 */
export function pickTopicNextVideo(
  groups: BrowseSectionGroup[]
): TopicNextVideo | null {
  const playable = groups.flatMap(group =>
    group.videos
      .filter(video => video.practiceHref)
      .map(video => ({ groupKey: group.key, video }))
  )
  const picked = pickNextStop([
    ...playable
      .filter(item => item.video.inProgress)
      .map(item => ({
        data: { ...item, resume: true },
        kind: 'resume' as const,
      })),
    ...playable
      .filter(item => item.video.completions === 0)
      .map(item => ({
        data: { ...item, resume: false },
        kind: 'next' as const,
      })),
  ])

  return picked.kind === 'done' ? null : picked.data
}

interface Props {
  /**
   * The videos fold into sections (the topic page): Continue opens the one
   * holding the next video. False for a flat list (favorites, uncategorized).
   */
  folded?: boolean
  groups: BrowseSectionGroup[]
  journey: Messages['common']['journey']
  labels: Messages['dictation']['topicJourney']
  next: TopicNextVideo | null
  thumbnailUrl: string | null
  title: string
}

/**
 * A compact strip for one topic (a sub-page, so lighter than a module
 * landing's JourneyCard): the record (its ring fills as videos are done), how
 * many are done with the bar and the gap to gold beside it. No next stop row:
 * an always-on floating Continue opens the section holding the next video
 * and scrolls to its card (ringed in pink), so the learner sees where it sits
 * before playing it.
 */
export function TopicJourney({
  folded = true,
  groups,
  journey,
  labels,
  next,
  thumbnailUrl,
  title,
}: Props) {
  const videos = groups.flatMap(group => group.videos)
  const total = videos.length
  const done = videos.filter(video => video.completions > 0).length
  const gold = total > 0 && done >= total
  const left = total - done
  const theme = MODULE_THEMES.dictation
  const Icon = MODULE_ICONS.dictation

  return (
    <section
      aria-labelledby="topic-journey-title"
      className={cn(
        'border-line rounded-panel grid min-w-0 gap-3 border bg-linear-160 p-3 sm:p-4',
        theme.gradient
      )}
      data-journey-card="dictation"
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <RecordDisc
          className="size-16 shrink-0 p-[3px] sm:size-16"
          done={done}
          gold={gold}
          image={getTopicTileImageUrl(thumbnailUrl)}
          initial={title.trim().charAt(0).toUpperCase() || '?'}
          total={total}
        />
        <div className="grid min-w-0 flex-1 gap-1.5">
          <h2
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium',
              theme.accent
            )}
            id="topic-journey-title"
          >
            {Icon ? (
              <Icon
                aria-hidden="true"
                className="size-3.5"
              />
            ) : null}
            {labels.title}
          </h2>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="flex items-baseline gap-x-1.5">
              <strong className="font-sans text-3xl leading-none font-light tracking-tight tabular-nums">
                {done}
              </strong>
              <span className="font-sans text-base font-medium">
                {plural(labels.unit, done)}
              </span>
              <span className="text-ink-soft text-xs">
                {format(labels.ofTotal, { total })}
              </span>
            </p>
            <p className="text-ink-soft text-xs font-medium">
              {gold ? labels.gold : plural(labels.toGold, left)}
            </p>
          </div>
          <Progress
            aria-label={format(labels.progress, { done, total })}
            tone="dictation"
            trackClassName="h-1.5 bg-surface/80"
            value={total > 0 ? Math.round((done / total) * 100) : 0}
          />
        </div>
      </div>
      {next ? (
        <TopicContinueFloat
          label={journey.continue}
          panelId={folded ? sectionPanelId(next.groupKey) : null}
          videoId={next.video.id}
        />
      ) : null}
    </section>
  )
}
