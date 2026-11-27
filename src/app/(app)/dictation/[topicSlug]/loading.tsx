import {
  SkeletonBlock,
  SkeletonHero,
  SkeletonPageShell,
  SkeletonRows,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle={t.dictation.meta.browseSubtitle}
    >
      <SkeletonHero />
      <SkeletonBlock className="rounded-control h-14" />
      <SkeletonRows
        count={4}
        rowClassName="h-14"
      />
    </SkeletonPageShell>
  )
}
