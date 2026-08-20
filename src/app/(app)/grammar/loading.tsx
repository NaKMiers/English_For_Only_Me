import {
  SkeletonBlock,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/grammar"
      subtitle="Grammar map by level and difficulty"
    >
      <SkeletonPanel lines={3} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock
            className="h-24"
            key={index}
          />
        ))}
      </div>
    </SkeletonPageShell>
  )
}
