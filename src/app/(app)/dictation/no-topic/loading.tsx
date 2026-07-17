import {
  SkeletonHero,
  SkeletonPageShell,
  SkeletonVideoGrid,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle="Browse dictation topics"
    >
      <SkeletonHero />
      <SkeletonVideoGrid count={6} />
    </SkeletonPageShell>
  )
}
