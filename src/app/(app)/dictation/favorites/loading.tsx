import {
  SkeletonHero,
  SkeletonPageShell,
  SkeletonVideoGrid,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle={t.dictation.meta.favoritesSubtitle}
    >
      <SkeletonHero />
      <SkeletonVideoGrid count={8} />
    </SkeletonPageShell>
  )
}
