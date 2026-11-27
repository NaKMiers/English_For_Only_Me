import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonPageShell,
} from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * The home simple view (the default): up-next rows, the next stop and the
 * numbers, then the buddy, in the same three columns.
 */
export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/"
      showAccount
    >
      <div className="grid gap-6">
        <div className="flex items-center justify-between gap-4">
          <SkeletonLine className="h-9 w-48" />
          <Skeleton className="size-11 rounded-full" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
          <div className="border-line bg-surface rounded-panel grid content-start gap-2 border p-3 sm:p-4 md:col-span-2 xl:col-span-1">
            <SkeletonLine className="m-2 h-7 w-32" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                className="rounded-control h-20 w-full"
                key={index}
              />
            ))}
          </div>
          <div className="grid content-start gap-5">
            <SkeletonBlock className="h-56" />
            <SkeletonBlock className="h-64" />
          </div>
          <SkeletonBlock className="h-[28rem]" />
        </div>
      </div>
    </SkeletonPageShell>
  )
}
