import {
  SkeletonHero,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle="Dictation Lab import desk"
    >
      <SkeletonHero />
      <SkeletonPanel lines={5} />
    </SkeletonPageShell>
  )
}
