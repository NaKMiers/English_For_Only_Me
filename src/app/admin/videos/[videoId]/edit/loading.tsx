import {
  SkeletonHero,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle="Dictation Lab edit desk"
    >
      <SkeletonHero />
      <SkeletonPanel lines={6} />
    </SkeletonPageShell>
  )
}
