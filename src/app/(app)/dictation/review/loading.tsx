import {
  SkeletonBlock,
  SkeletonPageShell,
  SkeletonRows,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    // Same topbar line and title as the page, so nothing changes on arrival.
    <SkeletonPageShell
      activeHref="/dictation"
      page={{
        breadcrumb: [
          { href: '/dictation', label: t.dictation.browse.allTopics },
          { label: t.dictation.review.title },
        ],
        module: 'dictation',
        subtitle: t.dictation.review.description,
        title: t.dictation.review.title,
      }}
      subtitle={t.dictation.meta.labSubtitle}
    >
      <SkeletonBlock className="h-24" />
      <SkeletonRows
        count={5}
        rowClassName="h-16"
      />
    </SkeletonPageShell>
  )
}
