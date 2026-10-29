import { MangaPageShell } from '@/components/common/MangaPageShell'
import { Skeleton } from '@/components/ui/skeleton'

export default function IeltsResultLoading() {
  return (
    <MangaPageShell>
      <div
        aria-busy
        aria-label="Đang tải kết quả"
        className="grid gap-6 p-4 sm:p-6 lg:p-8"
      >
        <Skeleton className="h-10 w-72 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map(index => (
            <Skeleton
              className="h-36 rounded-xl"
              key={index}
            />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </MangaPageShell>
  )
}
