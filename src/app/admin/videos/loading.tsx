import {
  SkeletonBlock,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell subtitle="Admin · Videos">
      <SkeletonPanel lines={1} />
      <SkeletonBlock className="h-96" />
    </SkeletonPageShell>
  )
}
