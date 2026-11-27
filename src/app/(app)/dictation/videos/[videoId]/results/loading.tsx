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
      subtitle={t.dictation.meta.labSubtitle}
    >
      <SkeletonPanel lines={2} />
      <SkeletonPanel lines={4} />
      <SkeletonPanel lines={3} />
      <SkeletonRows count={3} />
    </SkeletonPageShell>
  )
}
