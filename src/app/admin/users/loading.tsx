import {
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonTileRow,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell subtitle={t.admin.shell.users}>
      <SkeletonPanel lines={2} />
      <SkeletonTileRow count={4} />
      <SkeletonPanel lines={6} />
    </SkeletonPageShell>
  )
}
