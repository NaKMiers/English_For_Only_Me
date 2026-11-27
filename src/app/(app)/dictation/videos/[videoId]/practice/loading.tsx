import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonPageShell,
  SkeletonTag,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle="Dictation Lab listening module"
    >
      <div className="border-line bg-surface rounded-panel grid gap-3 border p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <SkeletonTag className="w-28" />
            <SkeletonLine className="h-8 w-64" />
          </div>
          <SkeletonBlock className="rounded-control h-10 w-40 border" />
        </div>
        <SkeletonBlock className="rounded-control h-12" />
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <SkeletonBlock className="aspect-video w-full" />
          <div className="grid gap-3">
            <SkeletonBlock className="rounded-control h-10" />
            <SkeletonBlock className="h-44" />
          </div>
        </div>
      </div>
    </SkeletonPageShell>
  )
}
