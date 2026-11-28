import {
  SkeletonHero,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell subtitle={t.admin.shell.editDesk}>
      <SkeletonHero />
      <SkeletonPanel lines={6} />
    </SkeletonPageShell>
  )
}
