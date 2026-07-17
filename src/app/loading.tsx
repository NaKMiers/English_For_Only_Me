import {
  SkeletonBlock,
  SkeletonLine,
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonTag,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell activeHref="/">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
        <section className="border-manga-black bg-manga-white grid gap-4 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)] sm:p-5">
          <div className="grid gap-2">
            <SkeletonTag />
            <SkeletonLine className="h-10 w-3/4" />
            <SkeletonLine className="w-2/3" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,340px)]">
            <SkeletonBlock className="h-48" />
            <SkeletonBlock className="h-48" />
          </div>
          <SkeletonBlock className="h-32" />
        </section>
        <aside className="grid gap-4">
          <div className="grid gap-2">
            <SkeletonTag />
            <SkeletonLine className="h-8 w-1/2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
          <SkeletonPanel lines={2} />
        </aside>
      </div>
    </SkeletonPageShell>
  )
}
