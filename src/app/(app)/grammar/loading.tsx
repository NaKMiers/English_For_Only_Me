import { PageShell } from '@/components/common/PageShell'
import { SkeletonHero } from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

export default async function GrammarLoading() {
  const t = await getMessages()

  return (
    <PageShell>
      <div
        aria-busy
        aria-label={t.grammar.loading}
        className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0"
      >
        <SkeletonHero withEyebrow={false} />
        <Skeleton className="rounded-panel h-52 w-full lg:h-40" />
        <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="flex gap-2 overflow-hidden lg:grid lg:content-start">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                className="lg:rounded-control h-11 w-40 shrink-0 rounded-full lg:w-full"
                key={index}
              />
            ))}
          </div>
          <div className="grid content-start gap-3">
            <Skeleton className="h-9 w-72 rounded-full" />
            <Skeleton className="rounded-panel h-72 w-full" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                className="rounded-panel h-[76px] w-full"
                key={index}
              />
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
