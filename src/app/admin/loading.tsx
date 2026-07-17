import {
  SkeletonBlock,
  SkeletonHero,
  SkeletonPageShell,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell subtitle="Admin">
      <SkeletonHero />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="h-28"
          />
        ))}
      </div>
    </SkeletonPageShell>
  )
}
