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
      <SkeletonBlock className="h-11 w-56" />
      <SkeletonPanel lines={2} />
      <SkeletonPanel lines={4} />
      <SkeletonPanel lines={3} />
    </SkeletonPageShell>
  )
}
