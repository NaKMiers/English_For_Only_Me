import {
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonRows,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle={t.dictation.meta.reviewSubtitle}
    >
      <SkeletonPanel lines={2} />
      <SkeletonRows count={4} />
    </SkeletonPageShell>
  )
}
