import { PageShell } from '@/components/common/PageShell'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

export default async function IeltsResultLoading() {
  const t = await getMessages()

  return (
    <PageShell>
      <div
        aria-busy
        aria-label={t.ielts.loading.result}
        className="grid gap-6 px-4 pb-6 md:pr-6 md:pl-0"
      >
        <Skeleton className="rounded-control h-10 w-72" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map(index => (
            <Skeleton
              className="rounded-panel h-36"
              key={index}
            />
          ))}
        </div>
        <Skeleton className="rounded-panel h-72 w-full" />
      </div>
    </PageShell>
  )
}
