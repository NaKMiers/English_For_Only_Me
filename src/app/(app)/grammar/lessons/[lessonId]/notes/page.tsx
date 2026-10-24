import { ArrowLeft, Play } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { ExplainCardView } from '@/components/grammar/player/PlayerCard'
import { MangaButton } from '@/components/ui/MangaButton'
import { grammarCourse } from '@/modules/grammar/course'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Props {
  params: Promise<{ lessonId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = grammarCourse.getLesson((await params).lessonId)

  return { title: found ? `Ghi chú: ${found.lesson.title}` : 'Grammar' }
}

/**
 * The lesson's explain cards as one page to reread. Built from the lesson
 * itself, so there is no second copy of the content to keep in sync. Opens
 * once the lesson is passed: before that, learning happens in the lesson.
 */
export default async function GrammarNotesPage({ params }: Props) {
  const found = grammarCourse.getLesson((await params).lessonId)

  if (!found) notFound()

  const { path } = await loadGrammarPageData()
  const node = path.units
    .flatMap(unit => unit.lessons)
    .find(lesson => lesson.id === found.lesson.id)

  if (!node || node.state === 'locked' || node.state === 'open')
    redirect('/grammar')

  const explains = found.lesson.cards.filter(card => card.kind === 'explain')

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/grammar"
          authControl={<AuthControl />}
          subtitle="Lộ trình ngữ pháp A1 - C1"
        />
      }
    >
      <div className="mx-auto grid w-full max-w-2xl gap-5 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap gap-3">
          <MangaButton
            href="/grammar"
            icon={<ArrowLeft aria-hidden />}
            tone="paper"
          >
            Lộ trình
          </MangaButton>
          <MangaButton
            href={`/grammar/lessons/${found.lesson.id}`}
            icon={
              <Play
                aria-hidden
                className="fill-current"
              />
            }
            tone="ink"
          >
            Học lại bài này
          </MangaButton>
        </div>
        <header className="grid gap-1">
          <p className="text-manga-ink-soft text-xs font-black uppercase">
            Unit {found.unit.order} · {found.unit.level} · Ghi chú
          </p>
          <h1 className="font-sans text-3xl leading-tight font-black sm:text-4xl">
            {found.lesson.title}
          </h1>
          <p className="text-manga-ink-soft">{found.lesson.summary}</p>
        </header>
        {explains.map(card => (
          <MangaPanel key={card.id}>
            <ExplainCardView card={card} />
          </MangaPanel>
        ))}
      </div>
    </MangaPageShell>
  )
}
