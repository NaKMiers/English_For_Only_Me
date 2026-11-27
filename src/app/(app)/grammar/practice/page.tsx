import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { GrammarPlayerPage } from '@/components/grammar/player/GrammarPlayerPage'
import { grammarCourse } from '@/modules/grammar/course'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'
import { buildWeakSet } from '@/modules/grammar/session/buildPracticeSet'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = { title: 'Grammar: weak spots' }

export default async function GrammarPracticePage() {
  const { canSave, progress } = await loadGrammarPageData()
  const cards = buildWeakSet(grammarCourse, progress.misses)

  if (cards.length === 0) redirect('/grammar')

  return (
    <GrammarPlayerPage
      canSave={canSave}
      cards={cards}
      intro="Questions you got wrong before. Each one leaves the list once you get it right."
      mode="weak"
      targetId="weak"
      title="Weak spots"
    />
  )
}
