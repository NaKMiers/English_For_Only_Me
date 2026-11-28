import {
  SkeletonJourney,
  SkeletonPageShell,
} from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

export default async function IeltsLoading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/ielts"
      page={{
        module: 'ielts',
        subtitle: t.ielts.home.intro,
        title: t.common.modules.ielts.title,
      }}
      subtitle={t.ielts.shell.subtitle}
    >
      <div
        aria-busy
        aria-label={t.ielts.loading.tests}
        className="grid gap-5"
      >
        <SkeletonJourney
          layout="stacked"
          metaphorClassName="h-[120px]"
          nextStop={false}
          statsPlacement="top"
        />
        {/* The metro lines: one row of stations per book. */}
        {[0, 1, 2].map(index => (
          <div
            className="grid gap-3"
            key={index}
          >
            <Skeleton className="rounded-tag h-5 w-40" />
            <Skeleton className="h-16 w-full rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonPageShell>
  )
}
