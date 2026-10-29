import { MangaPageShell } from '@/components/common/MangaPageShell'
import { Skeleton } from '@/components/ui/skeleton'

export default function IeltsLoading() {
  return (
    <MangaPageShell>
      <div
        aria-busy
        aria-label="Đang tải danh sách đề"
        className="grid gap-6 p-4 sm:p-6 lg:p-8"
      >
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="grid gap-2">
          {[0, 1, 2].map(index => (
            <Skeleton
              className="h-16 w-full rounded-lg"
              key={index}
            />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </MangaPageShell>
  )
}
