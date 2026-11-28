import {
  SkeletonPageShell,
  SkeletonTopicStrip,
  SkeletonVideoGrid,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/dictation"
      page={{
        breadcrumb: [
          { href: '/dictation', label: t.dictation.browse.allTopics },
          { label: t.dictation.favorites.title },
        ],
        module: 'dictation',
        title: t.dictation.favorites.title,
      }}
      subtitle={t.dictation.meta.favoritesSubtitle}
    >
      <SkeletonTopicStrip />
      <SkeletonVideoGrid count={8} />
    </SkeletonPageShell>
  )
}
