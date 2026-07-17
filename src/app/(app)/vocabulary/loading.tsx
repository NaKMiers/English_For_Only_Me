import {
  SkeletonHero,
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonTileRow,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/vocabulary"
      subtitle="Vocabulary memory spine"
    >
      <SkeletonHero />
      <SkeletonTileRow count={5} />
      <SkeletonPanel lines={3} />
      <SkeletonPanel lines={2} />
      <SkeletonPanel lines={4} />
    </SkeletonPageShell>
  )
}
