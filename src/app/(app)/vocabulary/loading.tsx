import {
  SkeletonJourney,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/vocabulary"
      page={{
        module: 'vocabulary',
        subtitle: t.vocabulary.dashboard.intro,
        title: t.vocabulary.dashboard.title,
      }}
      subtitle={t.vocabulary.page.subtitle}
    >
      {/* Same order as VocabularyLanding: garden card, then browse area. */}
      <SkeletonJourney
        chips={3}
        metaphorClassName="h-24"
      />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <SkeletonPanel lines={1} />
        <SkeletonPanel lines={6} />
      </div>
    </SkeletonPageShell>
  )
}
