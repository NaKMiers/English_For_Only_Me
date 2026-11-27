import {
  SkeletonPageShell,
  SkeletonPanel,
  SkeletonRows,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell subtitle={t.admin.shell.dictation}>
      <SkeletonPanel lines={3} />
      <SkeletonRows count={4} />
      <SkeletonPanel lines={2} />
    </SkeletonPageShell>
  )
}
