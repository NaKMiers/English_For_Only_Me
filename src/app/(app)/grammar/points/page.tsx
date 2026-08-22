import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { GrammarPointFilters } from '@/components/grammar/GrammarPointFilters'
import { GrammarPointMap } from '@/components/grammar/GrammarPointMap'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { GRAMMAR_POINTS_MAX_LIMIT } from '@/modules/grammar/constants'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { listGrammarPoints } from '@/modules/grammar/services/grammarPointListService'
import { parseGrammarPointsQuery } from '@/modules/grammar/services/grammarRouteDecisions'

export const metadata: Metadata = {
  title: 'Grammar Points',
  description:
    'The complete English grammar map, grouped by CEFR level and by difficulty.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TOPBAR_SUBTITLE = 'Grammar map by level and difficulty'

export default async function GrammarPointsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(raw))
    if (typeof value === 'string') params.set(key, value)
    else if (Array.isArray(value) && value[0]) params.set(key, value[0])

  const parsed = parseGrammarPointsQuery(params)

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
              <code>bun run grammar:seed</code> to load the taxonomy.
            </p>
            <MangaButton href="/">Back To Study Desk</MangaButton>
          </MangaPanel>
        </section>
      </MangaPageShell>
    )

  if (!parsed.ok)
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
            title="Bad filters"
          >
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              {parsed.body.message}
            </p>
            <MangaButton href="/grammar/points">Reset Filters</MangaButton>
          </MangaPanel>
        </section>
      </MangaPageShell>
    )

  const actorId = (await getPracticeActorId()) ?? null

  await connectDatabase()

  // The map draws every rule the filters match, so it asks for all of them.
  // Paging a map defeats the point of drawing one: the shape of the curriculum
  // is the information, and a shape cut into five pages is five shapes. The
  // taxonomy is 184 rules against a 200 ceiling, so one query still covers it -
  // and `limit` is capped by the schema, so this cannot become an unbounded read.
  const result = await listGrammarPoints(
    {
      ...parsed.data,
      limit: GRAMMAR_POINTS_MAX_LIMIT,
      page: 1,
    },
    actorId
  )

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
        <GrammarPointFilters query={parsed.data} />
        <GrammarPointMap result={result} />
      </section>
    </MangaPageShell>
  )
}
