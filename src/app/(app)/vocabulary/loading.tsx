import {
  SkeletonHero,
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonTileRow,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/vocabulary"
      subtitle={t.vocabulary.page.subtitle}
    >
      <SkeletonHero />
      <SkeletonTileRow count={5} />
      <SkeletonPanel lines={3} />
      <SkeletonPanel lines={2} />
      <SkeletonPanel lines={4} />
    </SkeletonPageShell>
  )
}
