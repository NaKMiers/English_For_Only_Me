import {
  SkeletonBlock,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

/** Same order as the result page: the session-end head, then the review. */
export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/ielts"
      subtitle={t.ielts.shell.subtitle}
    >
      <SkeletonBlock className="h-44" />
      <Skeleton className="rounded-panel h-16 w-full" />
      <SkeletonPanel lines={2} />
      <SkeletonPanel lines={5} />
    </SkeletonPageShell>
  )
}
