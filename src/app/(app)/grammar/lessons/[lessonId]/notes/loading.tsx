import {
  SkeletonBlock,
  SkeletonPageShell,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'
import { getMessages } from '@/i18n/server'

/** Notes are a reading page: the header, a few explain cards, the stop. */
export default async function Loading() {
  const t = await getMessages()

  return (
    <SkeletonPageShell
      activeHref="/grammar"
      subtitle={t.grammar.subtitle}
    >
      <div className="mx-auto grid w-full max-w-3xl gap-5">
        <SkeletonPanel lines={4} />
        <SkeletonPanel lines={4} />
        <SkeletonBlock className="h-16" />
      </div>
    </SkeletonPageShell>
  )
}
