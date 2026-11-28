import { BookOpen, Play, Trophy } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { ContentPanel } from '@/components/common/ContentPanel'
import { nextHref, nextLabel } from '@/components/grammar/path/pathNext'
import { ExplainCardView } from '@/components/grammar/player/PlayerCard'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { ActionButton } from '@/components/ui/ActionButton'
import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { grammarCourse } from '@/modules/grammar/course'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Props {
  params: Promise<{ lessonId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = grammarCourse.getLesson((await params).lessonId)
  const t = await getMessages()

  return {
    title: found
      ? format(t.grammar.meta.notes, { title: found.lesson.title })
      : t.common.modules.grammar.title,
  }
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
  const t = await getMessages()
  const breadcrumb = [
    { href: '/grammar', label: t.grammar.path.title },
    {
      label: format(t.grammar.notes.eyebrow, {
        level: found.unit.level,
        order: found.unit.order,
      }),
    },
  ]

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/grammar"
          page={{ breadcrumb, module: 'grammar', title: found.lesson.title }}
          subtitle={t.grammar.subtitle}
        />
      }
    >
      <div className="mx-auto grid w-full max-w-3xl gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          actions={
            <ActionButton
              href={`/grammar/lessons/${found.lesson.id}`}
              icon={
                <Play
                  aria-hidden
                  className="fill-current"
                />
              }
              tone="paper"
            >
              {t.grammar.notes.redo}
            </ActionButton>
          }
          breadcrumb={{ items: breadcrumb, label: t.common.journey.breadcrumb }}
          icon={<BookOpen />}
          iconClassName="bg-pastel-lilac text-accent-purple"
          inTopbar
          subtitle={found.lesson.summary}
          title={found.lesson.title}
        />
        {explains.map(card => (
          <ContentPanel key={card.id}>
            <ExplainCardView card={card} />
          </ContentPanel>
        ))}

        {/* A station, not a dead end: one next stop after the notes. */}
        <NextStopCard
          actionIcon={
            <Play
              aria-hidden
              className="fill-current"
            />
          }
          actionLabel={
            node.state === 'due'
              ? t.grammar.path.review
              : path.next.kind === 'lesson'
                ? t.grammar.path.startLesson
                : t.grammar.path.go
          }
          detail={
            node.state === 'due'
              ? t.grammar.path.states.due
              : t.grammar.path.continue
          }
          done={
            node.state !== 'due' && path.next.kind === 'done'
              ? {
                  icon: (
                    <Trophy
                      aria-hidden
                      className="text-accent-purple"
                    />
                  ),
                  text: t.grammar.path.next.done,
                }
              : undefined
          }
          href={
            node.state === 'due'
              ? `/grammar/lessons/${found.lesson.id}/review`
              : nextHref(path.next)
          }
          pinLabel={t.common.journey.nextStop}
          title={
            node.state === 'due'
              ? found.lesson.title
              : nextLabel(t.grammar.path.next, path.next)
          }
          variant="compact"
        />
      </div>
    </PageShell>
  )
}
