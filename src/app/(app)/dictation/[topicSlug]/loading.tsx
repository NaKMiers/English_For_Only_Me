import {
  SkeletonPageShell,
  SkeletonRows,
  SkeletonTopicStrip,
} from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/dictation"
      page={{
        breadcrumb: [
          { href: '/dictation', label: t.dictation.browse.allTopics },
        ],
        module: 'dictation',
        // The topic's title lands with the data; a blank keeps the row height.
        title: '\u00a0',
      }}
      subtitle={t.dictation.meta.browseSubtitle}
    >
      {/* Same order as the topic page: record strip, search, sections. */}
      <SkeletonTopicStrip />
      <Skeleton className="rounded-control h-11 w-full" />
      <SkeletonRows
        count={4}
        rowClassName="h-12"
      />
    </SkeletonPageShell>
  )
}
