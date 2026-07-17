import {
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonRows,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle="Dictation Lab listening module"
    >
      <SkeletonPanel lines={2} />
      <SkeletonPanel lines={4} />
      <SkeletonPanel lines={3} />
      <SkeletonRows count={3} />
    </SkeletonPageShell>
  )
}
