import {
  SkeletonHero,
  SkeletonPageShell,
  SkeletonVideoGrid,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle="Your favorites"
    >
      <SkeletonHero />
      <SkeletonVideoGrid count={8} />
    </SkeletonPageShell>
  )
}
