import {
  SkeletonBlock,
  SkeletonPageShell,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/grammar"
      subtitle="Grammar map by level and difficulty"
    >
      <SkeletonBlock className="h-24" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <SkeletonBlock
            className="h-44"
            key={index}
          />
        ))}
      </div>
    </SkeletonPageShell>
  )
}
