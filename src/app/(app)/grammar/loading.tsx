import {
  SkeletonJourney,
  SkeletonPageShell,
} from '@/components/common/PageSkeletons'
import { Skeleton } from '@/components/ui/skeleton'
import { getMessages } from '@/i18n/server'

export default async function GrammarLoading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/grammar"
      page={{ module: 'grammar', title: t.grammar.path.title }}
      subtitle={t.grammar.subtitle}
    >
      <div
        aria-busy
        aria-label={t.grammar.loading}
        className="grid gap-5"
      >
        <SkeletonJourney
          metaphorClassName="h-36 sm:h-28"
          nextStop={false}
        />
        {/* The winding path: one centred column of unit cards. */}
        <div className="mx-auto grid w-full max-w-xl content-start gap-4 lg:max-w-2xl">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              className="rounded-panel h-[76px] w-full"
              key={index}
            />
          ))}
        </div>
      </div>
    </SkeletonPageShell>
  )
}
