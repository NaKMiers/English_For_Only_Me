import {
  SkeletonBlock,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

/** Same order as the results page: the session-end head, then the panels. */
export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/dictation"
      page={{ module: 'dictation', title: t.dictation.meta.resultsTitle }}
      subtitle={t.dictation.meta.labSubtitle}
    >
      <SkeletonBlock className="h-56" />
      <Skeleton className="rounded-panel h-16 w-full" />
      <SkeletonPanel lines={4} />
      <Skeleton className="rounded-panel h-12 w-full" />
    </SkeletonPageShell>
  )
}
