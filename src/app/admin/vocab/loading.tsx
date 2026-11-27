import {
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonTileRow,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/admin/vocab"
      subtitle={t.admin.shell.vocab}
    >
      <SkeletonPanel lines={2} />
      <SkeletonTileRow count={4} />
      <SkeletonPanel lines={3} />
    </SkeletonPageShell>
  )
}
