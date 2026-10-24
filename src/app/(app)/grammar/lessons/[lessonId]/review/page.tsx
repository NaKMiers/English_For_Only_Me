import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { GrammarPlayerPage } from '@/components/grammar/player/GrammarPlayerPage'
import { grammarCourse } from '@/modules/grammar/course'
import { createRng, randomSeed } from '@/modules/grammar/rng'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'
import { buildReviewSet } from '@/modules/grammar/session/buildPracticeSet'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = { title: 'Grammar: ôn tập' }

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

  return (
    <GrammarPlayerPage
      canSave={canSave}
      cards={cards}
      intro="Ôn nhanh: trả lời đúng từ 80% trở lên để bài này giữ được lâu hơn."
      mode="review"
      targetId={found.lesson.id}
      title={`Ôn: ${found.lesson.title}`}
    />
  )
}
