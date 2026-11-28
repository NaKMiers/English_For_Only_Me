import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { GrammarPlayerPage } from '@/components/grammar/player/GrammarPlayerPage'
import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { grammarCourse } from '@/modules/grammar/course'
import { createRng, randomSeed } from '@/modules/grammar/rng'
import { buildPlayerJourney } from '@/modules/grammar/path/playerJourney'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'
import { buildReviewSet } from '@/modules/grammar/session/buildPracticeSet'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages()).grammar.meta.review }
}

interface Props {
  params: Promise<{ lessonId: string }>
}

export default async function GrammarReviewPage({ params }: Props) {
  const found = grammarCourse.getLesson((await params).lessonId)

  if (!found) notFound()

  const { canSave, path, progress } = await loadGrammarPageData()
  const node = path.units
    .flatMap(unit => unit.lessons)
    .find(lesson => lesson.id === found.lesson.id)

  // Only a lesson that is actually due can be reviewed; the server enforces
  // the same rule when the session is saved.
  if (node?.state !== 'due') redirect('/grammar')

  const cards = buildReviewSet(
    grammarCourse,
    found.lesson,
    progress.misses,
    createRng(randomSeed())
  )
  const t = await getMessages()

  return (
    <GrammarPlayerPage
      journey={buildPlayerJourney(path, 'review', found.lesson.id)}
      canSave={canSave}
      cards={cards}
      intro={t.grammar.sessions.reviewIntro}
      mode="review"
      targetId={found.lesson.id}
      title={format(t.grammar.sessions.reviewTitle, {
        title: found.lesson.title,
      })}
    />
  )
}
