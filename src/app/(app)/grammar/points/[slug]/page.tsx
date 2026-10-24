import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { GrammarComicLesson } from '@/components/grammar/GrammarComicLesson'
import { GrammarPointActions } from '@/components/grammar/GrammarPointActions'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabaseWhen } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { getCachedGrammarLesson } from '@/modules/grammar/services/grammarContentCache'
import {
  buildLearnerPresentationState,
  getLearnerHistory,
} from '@/modules/grammar/services/grammarPresentationService'
import { parseGrammarPointSlug } from '@/modules/grammar/services/grammarRouteDecisions'
import { getGrammarItemsForActor } from '@/modules/grammar/services/userGrammarItemService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TOPBAR_SUBTITLE = 'Grammar map by level and difficulty'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  return {
    title: `Grammar: ${slug.replace(/-/g, ' ')}`,
    description: 'A single grammar point with examples, traps, and contrasts.',
  }
}

export default async function GrammarPointPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const parsed = parseGrammarPointSlug((await params).slug)

  if (!parsed.ok) notFound()

  if (!hasMongoDbUri())
    return (
      <MangaPageShell
        topbar={
          <AppTopbar
            activeHref="/grammar"
            authControl={<AuthControl />}
            subtitle={TOPBAR_SUBTITLE}
          />
        }
      >
        <section className="p-4 sm:p-6 lg:p-8">
          <MangaPanel
            eyebrow="Grammar"
            title="Database needed"
          >
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              Set MONGODB_URI on the server, then run{' '}
              <code>bun run grammar:seed</code>.
            </p>
            <MangaButton href="/">Back To Study Desk</MangaButton>
          </MangaPanel>
        </section>
      </MangaPageShell>
    )

  // The lesson is shared content from the cache; only a known learner needs a
  // connection, and it opens while the lesson is read.
  const [lesson, rawActorId] = await Promise.all([
    getCachedGrammarLesson(parsed.data.slug),
    connectDatabaseWhen(getPracticeActorId()),
  ])

  if (!lesson) notFound()

  // `actorId` is '' for a signed-out visitor, and the comic layer distinguishes
  // that from a real actor: no verdict line, no scar, no wrong count.
  const actorId = rawActorId ?? ''
  const [items, history] = await Promise.all([
    getGrammarItemsForActor({
      actorId,
      pointSlugs: [lesson.slug],
    }),
    getLearnerHistory({ actorId: actorId || null, pointSlug: lesson.slug }),
  ])
  const item = items.get(lesson.slug) ?? null
  const learnerState = buildLearnerPresentationState({
    actorId: actorId || null,
    history,
    item,
  })

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/grammar"
          authControl={<AuthControl />}
          subtitle={TOPBAR_SUBTITLE}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <MangaButton href="/grammar/points">Back To Grammar Map</MangaButton>
        <GrammarPointActions
          initialItem={item}
          slug={lesson.slug}
        />
        <GrammarComicLesson
          learnerState={learnerState}
          lesson={lesson}
        />
      </section>
    </MangaPageShell>
  )
}
