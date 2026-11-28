import {
  SkeletonJourney,
  SkeletonPageShell,
  SkeletonVideoGrid,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/dictation"
      subtitle={t.dictation.meta.browseSubtitle}
    >
      <SkeletonJourney
        chips={0}
        layout="stacked"
        metaphorClassName="h-2"
      />
      <SkeletonVideoGrid count={6} />
    </SkeletonPageShell>
  )
}
