import {
  SkeletonBlock,
  SkeletonHero,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/vocabulary"
      subtitle={t.vocabulary.page.subtitle}
    >
      <SkeletonHero withEyebrow={false} />
      {/* Same grid as VocabularyDashboard: recall card | strip and charts. */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <SkeletonBlock className="h-64" />
        <div className="grid content-start gap-3">
          <SkeletonBlock className="h-20" />
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <SkeletonBlock className="h-40" />
            <SkeletonBlock className="h-40" />
          </div>
        </div>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SkeletonPanel lines={1} />
        <SkeletonPanel lines={6} />
      </div>
    </SkeletonPageShell>
  )
}
