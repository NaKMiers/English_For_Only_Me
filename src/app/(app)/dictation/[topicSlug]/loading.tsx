import {
  SkeletonBlock,
  SkeletonHero,
  SkeletonPageShell,
  SkeletonRows,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle="Browse dictation topics"
    >
      <SkeletonHero />
      <SkeletonBlock className="h-14" />
      <SkeletonRows
        count={4}
        rowClassName="h-14"
      />
    </SkeletonPageShell>
  )
}
