import { MangaPageShell } from '@/components/common/MangaPageShell'
import { Skeleton } from '@/components/ui/skeleton'

export default function GrammarLoading() {
  return (
    <MangaPageShell>
      <div
        aria-busy
        aria-label="Đang tải lộ trình"
        className="grid gap-6 p-4 sm:p-6 lg:p-8"
      >
        <Skeleton className="rounded-control h-10 w-64" />
        <Skeleton className="rounded-panel h-16 w-full" />
        <div className="mx-auto grid w-full max-w-xl justify-items-center gap-7">
          <Skeleton className="rounded-panel h-28 w-full" />
          {[0, 44, 64, 44, 0].map((offset, index) => (
            <Skeleton
              className="size-16 rounded-full"
              key={index}
              style={{ transform: `translateX(${offset}px)` }}
            />
          ))}
        </div>
      </div>
    </MangaPageShell>
  )
}
