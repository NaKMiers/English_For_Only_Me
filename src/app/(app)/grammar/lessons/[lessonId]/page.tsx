import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { GrammarPlayerPage } from '@/components/grammar/player/GrammarPlayerPage'
import { grammarCourse } from '@/modules/grammar/course'
import { isLessonUnlocked } from '@/modules/grammar/path/buildGrammarPath'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Props {
  params: Promise<{ lessonId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = grammarCourse.getLesson((await params).lessonId)

  return { title: found ? `Grammar: ${found.lesson.title}` : 'Grammar' }
}

export default async function GrammarLessonPage({ params }: Props) {
  const { lessonId } = await params
  const found = grammarCourse.getLesson(lessonId)

  if (!found) notFound()
  if (found.lesson.id !== lessonId)
    redirect(`/grammar/lessons/${found.lesson.id}`)

  const { canSave, progress } = await loadGrammarPageData()

  if (
    !isLessonUnlocked({ course: grammarCourse, ...progress }, found.lesson.id)
  )
    redirect('/grammar')

  return (
    <GrammarPlayerPage
      canSave={canSave}
      cards={found.lesson.cards}
      mode="lesson"
      targetId={found.lesson.id}
      title={found.lesson.title}
    />
  )
}
