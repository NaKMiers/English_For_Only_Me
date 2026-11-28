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
          { label: t.dictation.browse.uncategorized },
        ],
        module: 'dictation',
        subtitle: t.dictation.noTopic.description,
        title: t.dictation.browse.uncategorized,
      }}
      subtitle={t.dictation.meta.browseSubtitle}
    >
      <SkeletonTopicStrip />
      <SkeletonVideoGrid count={6} />
    </SkeletonPageShell>
  )
}
