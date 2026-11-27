import {
  SkeletonHero,
  SkeletonPageShell,
  SkeletonTileRow,
  SkeletonVideoGrid,
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
      <SkeletonVideoGrid count={8} />
      <SkeletonTileRow count={4} />
    </SkeletonPageShell>
  )
}
