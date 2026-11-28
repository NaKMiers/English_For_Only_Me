import {
  SkeletonJourney,
  SkeletonPageShell,
  SkeletonRows,
} from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

/** Same order as the test page: journey card, mode switch, skill rows. */
export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/ielts"
      subtitle={t.ielts.shell.subtitle}
    >
      <SkeletonJourney
        chips={3}
        layout="stacked"
        metaphorClassName="h-11"
      />
      <Skeleton className="h-12 w-56 rounded-full" />
      <SkeletonRows
        count={3}
        rowClassName="h-14"
      />
    </SkeletonPageShell>
  )
}
