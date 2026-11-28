import { Headphones } from 'lucide-react'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { EmptyState } from '@/components/journey/EmptyState'
import type { Messages } from '@/i18n/messages'

import { BrowseVideoList, type BrowseVideoItem } from './BrowseVideoList'
import { pickTopicNextVideo, TopicJourney } from './TopicJourney'

interface Props {
  canFavorite: boolean
  /** Shown with a "Browse topics" action when the list is empty. */
  emptyTitle: string
  items: BrowseVideoItem[]
  messages: Messages
  subtitle?: string
  title: string
  /** The board topbar's own line for this list. */
  topbarSubtitle: string
}

/**
 * One flat list of dictation videos (uncategorized, favorites) on the shared
 * shape: title in the topbar with a breadcrumb, a small record card with
 * the next unplayed video, then the video grid or an empty state.
 */
export function VideoListPage({
  canFavorite,
  emptyTitle,
  items,
  messages: t,
  subtitle,
  title,
  topbarSubtitle,
}: Props) {
  const labels = t.dictation.browse
  const breadcrumb = [
    { href: '/dictation', label: labels.allTopics },
    { label: title },
  ]
  const groups = [{ key: 'all', title, videos: items }]

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          page={{ breadcrumb, module: 'dictation', subtitle, title }}
          subtitle={topbarSubtitle}
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          breadcrumb={{ items: breadcrumb, label: t.common.journey.breadcrumb }}
          icon={<Headphones />}
          iconClassName="bg-pastel-sky text-accent-blue"
          inTopbar
          subtitle={subtitle}
          title={title}
        />
        {items.length === 0 ? (
          <EmptyState
            action={{ href: '/dictation', label: labels.allTopics }}
            icon={<Headphones />}
            title={emptyTitle}
          />
        ) : (
          <>
            <TopicJourney
              folded={false}
              groups={groups}
              journey={t.common.journey}
              labels={t.dictation.topicJourney}
              next={pickTopicNextVideo(groups)}
              thumbnailUrl={null}
              title={title}
            />
            <BrowseVideoList
              videos={items}
              canFavorite={canFavorite}
              labels={labels.card}
              nextId={pickTopicNextVideo(groups)?.video.id ?? null}
            />
          </>
        )}
      </section>
    </PageShell>
  )
}
