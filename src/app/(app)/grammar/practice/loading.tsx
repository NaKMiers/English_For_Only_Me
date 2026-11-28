import { SkeletonPlayer } from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

/** The player is a full-height focus screen: no topbar or path to flash. */
export default async function Loading() {
  const t = await getMessages()

  return <SkeletonPlayer label={t.grammar.loadingLesson} />
}
