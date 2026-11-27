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
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="h-28"
          />
        ))}
      </div>
    </SkeletonPageShell>
  )
}
