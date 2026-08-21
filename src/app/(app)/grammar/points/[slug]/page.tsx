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
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { getLearnerPresentationState } from '@/modules/grammar/services/grammarPresentationService'
import { getGrammarLesson } from '@/modules/grammar/services/grammarPointListService'
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

  const actorId = (await getPracticeActorId()) ?? ''

  await connectDatabase()

  const lesson = await getGrammarLesson(parsed.data.slug)

  if (!lesson) notFound()

  const items = await getGrammarItemsForActor({
    actorId,
    pointSlugs: [lesson.slug],
  })
  const item = items.get(lesson.slug) ?? null
  // `actorId` is '' for a signed-out visitor, and the comic layer distinguishes
  // that from a real actor: no verdict line, no scar, no wrong count.
  const learnerState = await getLearnerPresentationState({
    actorId: actorId || null,
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
