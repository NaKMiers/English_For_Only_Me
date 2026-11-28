import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { GrammarPlayerPage } from '@/components/grammar/player/GrammarPlayerPage'
import { getMessages } from '@/i18n/server'
import { grammarCourse } from '@/modules/grammar/course'
import { buildPlayerJourney } from '@/modules/grammar/path/playerJourney'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'
import { buildWeakSet } from '@/modules/grammar/session/buildPracticeSet'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).grammar.meta.weak }
}

export default async function GrammarPracticePage() {
  const { canSave, path, progress } = await loadGrammarPageData()
  const cards = buildWeakSet(grammarCourse, progress.misses)

  if (cards.length === 0) redirect('/grammar')

  const t = await getMessages()

  return (
    <GrammarPlayerPage
      journey={buildPlayerJourney(path, 'weak', 'weak')}
      canSave={canSave}
      cards={cards}
      intro={t.grammar.sessions.weakIntro}
      mode="weak"
      targetId="weak"
      title={t.grammar.sessions.weakTitle}
    />
  )
}
