import {
  SkeletonJourney,
  SkeletonPageShell,
} from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

export default async function Loading() {
  const t = await getMessages()
  const text = t.dictation.landing

  return (
    <SkeletonPageShell
      activeHref="/dictation"
      page={{
        module: 'dictation',
        subtitle: text.descriptionSignedIn,
        title: text.title,
      }}
      subtitle={t.dictation.meta.browseSubtitle}
    >
      <SkeletonJourney
        layout="aside"
        metaphorClassName="h-[70px]"
        statsPlacement="top"
      />
      {/* The record shelves: a heading and a row of discs. */}
      <div className="grid gap-3">
        <Skeleton className="rounded-tag h-6 w-28" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              className="size-32 shrink-0 rounded-full"
              key={index}
            />
          ))}
        </div>
      </div>
    </SkeletonPageShell>
  )
}
