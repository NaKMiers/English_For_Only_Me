import {
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonRows,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle="Weak sentence review"
    >
      <SkeletonPanel lines={2} />
      <SkeletonRows count={4} />
    </SkeletonPageShell>
  )
}
