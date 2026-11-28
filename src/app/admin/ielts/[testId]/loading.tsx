import { Skeleton } from '@/components/ui/skeleton'

/** The test editor is a full work screen: header row, then the panes. */
export default function Loading() {
  return (
    <div
      aria-busy
      className="flex min-h-dvh flex-col gap-4 p-4"
    >
      <Skeleton className="rounded-control h-14 w-full" />
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Skeleton className="rounded-panel min-h-80" />
        <Skeleton className="rounded-panel min-h-80" />
      </div>
    </div>
  )
}
