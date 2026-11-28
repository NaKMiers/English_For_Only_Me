import {
  SkeletonBlock,
  SkeletonHero,
  SkeletonPageShell,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell subtitle={t.admin.shell.admin}>
      <SkeletonHero />
      {/* Same grid as the dashboard: three module tiles. */}
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="h-36"
          />
        ))}
      </div>
    </SkeletonPageShell>
  )
}
