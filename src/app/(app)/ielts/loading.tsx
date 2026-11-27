import { PageShell } from '@/components/common/PageShell'
import { SkeletonHero } from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

export default async function IeltsLoading() {
  const t = await getMessages()

  return (
    <PageShell>
      <div
        aria-busy
        aria-label={t.ielts.loading.tests}
        className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0"
      >
        <SkeletonHero withEyebrow={false} />
        <Skeleton className="h-10 w-full max-w-2xl rounded-full" />
        <div className="grid items-start gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map(index => (
            <Skeleton
              className="rounded-panel h-44 w-full"
              key={index}
            />
          ))}
        </div>
      </div>
    </PageShell>
  )
}
