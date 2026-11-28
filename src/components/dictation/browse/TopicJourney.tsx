import { ArrowRight, Medal, Play } from 'lucide-react'

import {
  JourneyCard,
  JourneyHeadline,
  MilestoneNote,
} from '@/components/journey/JourneyCard'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { Progress } from '@/components/ui/progress'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { pickNextStop } from '@/lib/journey/nextStop'

import type { BrowseSectionGroup, BrowseVideoItem } from './SectionAccordion'
import { RecordDisc } from './RecordShelves'
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
  groups: BrowseSectionGroup[]
  journey: Messages['common']['journey']
  labels: Messages['dictation']['topicJourney']
  next: TopicNextVideo | null
  thumbnailUrl: string | null
  title: string
}

/**
 * A small journey card for one topic: its record (the ring fills as videos
 * are done), how many are done, how few are left to gold, and one next stop
 * straight into the next video.
 */
export function TopicJourney({
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

  return (
    <JourneyCard
      headline={
        <div className="flex items-center gap-4">
          <RecordDisc
            className="size-20 p-1 sm:size-20"
            done={done}
            gold={gold}
            image={getTopicTileImageUrl(thumbnailUrl)}
            initial={title.trim().charAt(0).toUpperCase() || '?'}
            total={total}
          />
          <JourneyHeadline
            total={format(labels.ofTotal, { total })}
            unit={labels.unit}
            value={done}
          />
        </div>
      }
      layout="stacked"
      metaphor={
        <Progress
          aria-label={format(labels.progress, { done, total })}
          tone="dictation"
          trackClassName="h-2 bg-surface/80"
          value={total > 0 ? Math.round((done / total) * 100) : 0}
        />
      }
      milestone={
        <MilestoneNote>
          {gold ? labels.gold : plural(labels.toGold, left)}
        </MilestoneNote>
      }
      module="dictation"
      nextStop={
        <NextStopCard
          actionIcon={
            next?.resume ? (
              <Play
                aria-hidden="true"
                className="fill-current"
              />
            ) : (
              <ArrowRight aria-hidden="true" />
            )
          }
          actionLabel={next?.resume ? labels.continue : labels.start}
          detail={next?.resume ? labels.resume : labels.nextVideo}
          done={
            next
              ? undefined
              : { icon: <Medal aria-hidden="true" />, text: labels.allDone }
          }
          href={next?.video.practiceHref ?? null}
          pinLabel={journey.nextStop}
          title={next?.video.title ?? ''}
          variant="compact"
        />
      }
      title={labels.title}
      titleId="topic-journey-title"
    />
  )
}
