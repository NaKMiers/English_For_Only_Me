import {
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'

export default function Loading() {
  return (
    <SkeletonPageShell
      activeHref="/admin/grammar"
      subtitle="Admin grammar review"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonPanel
          key={index}
          lines={3}
        />
      ))}
    </SkeletonPageShell>
  )
}
