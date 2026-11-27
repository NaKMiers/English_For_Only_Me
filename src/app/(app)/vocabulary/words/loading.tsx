import {
  SkeletonBlock,
  SkeletonHero,
  SkeletonPageShell,
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
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="h-10 w-28 shrink-0 rounded-full"
          />
        ))}
      </div>
      <SkeletonBlock className="h-16" />
      {/* One dense row per word, like VocabularyWordList. */}
      <SkeletonBlock className="h-[30rem]" />
    </SkeletonPageShell>
  )
}
