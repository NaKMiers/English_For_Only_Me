import {
  SkeletonBlock,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/vocabulary"
      subtitle={t.vocabulary.page.subtitle}
    >
      <SkeletonPanel lines={1} />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="rounded-control h-10 w-28 border"
          />
        ))}
      </div>
      <SkeletonBlock className="h-20" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonBlock
            key={index}
            className="h-44"
          />
        ))}
      </div>
    </SkeletonPageShell>
  )
}
