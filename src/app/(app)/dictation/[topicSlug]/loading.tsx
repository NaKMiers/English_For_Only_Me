import {
  SkeletonJourney,
  SkeletonPageShell,
  SkeletonRows,
} from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle={t.dictation.meta.browseSubtitle}
    >
      {/* Same order as the topic page: record card, search, sections. */}
      <SkeletonJourney
        chips={0}
        layout="stacked"
        metaphorClassName="h-2"
      />
      <Skeleton className="rounded-control h-11 w-full" />
      <SkeletonRows
        count={4}
        rowClassName="h-12"
      />
    </SkeletonPageShell>
  )
}
