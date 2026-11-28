import { SkeletonPlayer } from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

/** Practice is a full-height focus screen: no topbar or tab bar to flash. */
export default async function Loading() {
  const t = await getMessages()

  return <SkeletonPlayer label={t.dictation.meta.practiceTitle} />
}
