import {
  SkeletonBlock,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/vocabulary"
      subtitle="Vocabulary memory spine"
    >
      <SkeletonPanel lines={1} />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="h-10 w-28 border-2"
          />
        ))}
      </div>
      <SkeletonBlock className="h-20" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="h-44"
          />
        ))}
      </div>
    </SkeletonPageShell>
  )
}
