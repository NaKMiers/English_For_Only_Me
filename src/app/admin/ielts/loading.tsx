import {
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonTileRow,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/admin/vocab"
      subtitle="Admin vocabulary enrichment"
    >
      <SkeletonPanel lines={2} />
      <SkeletonTileRow count={4} />
      <SkeletonPanel lines={3} />
    </SkeletonPageShell>
  )
}
