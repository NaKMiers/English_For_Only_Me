import { PageShell } from '@/components/common/PageShell'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

export default async function IeltsLoading() {
  const t = await getMessages()

  return (
    <PageShell>
      <div
        aria-busy
        aria-label={t.ielts.loading.tests}
        className="grid gap-6 p-4 sm:p-6 lg:p-8"
      >
        <Skeleton className="rounded-control h-10 w-64" />
        <Skeleton className="rounded-panel h-16 w-full" />
        <div className="grid gap-2">
          {[0, 1, 2].map(index => (
            <Skeleton
              className="rounded-control h-16 w-full"
              key={index}
            />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="rounded-panel h-48 w-full" />
          <Skeleton className="rounded-panel h-48 w-full" />
        </div>
      </div>
    </PageShell>
  )
}
