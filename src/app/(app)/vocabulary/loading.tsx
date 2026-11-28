import {
  SkeletonPageShell,
  SkeletonVocabularyLanding,
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
      <SkeletonVocabularyLanding />
    </SkeletonPageShell>
  )
}
