import {
  SkeletonBlock,
  SkeletonPageShell,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/vocabulary"
      page={{
        breadcrumb: [
          { href: '/vocabulary', label: t.vocabulary.dashboard.title },
        ],
        module: 'vocabulary',
        // The view's name comes from the URL; a blank keeps the row height.
        title: '\u00a0',
      }}
      subtitle={t.vocabulary.page.subtitle}
    >
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="h-11 w-28 shrink-0 rounded-full"
          />
        ))}
      </div>
      {/* The search field. */}
      <SkeletonBlock className="rounded-control h-11" />
      {/* One dense row per word, like VocabularyWordList. */}
      <SkeletonBlock className="h-[30rem]" />
    </SkeletonPageShell>
  )
}
