import {
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonRows,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell subtitle="Admin · Topics">
      <SkeletonPanel lines={3} />
      <SkeletonRows count={4} />
      <SkeletonPanel lines={2} />
    </SkeletonPageShell>
  )
}
