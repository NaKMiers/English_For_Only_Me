import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { Sensei } from '@/components/grammar/cast/Sensei'
import { ComicPanel } from '@/components/grammar/comic/ComicPanel'
import { SpeechBubble } from '@/components/grammar/comic/SpeechBubble'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { GRAMMAR_FAMILY_LABELS } from '@/modules/grammar/constants'
import { getGrammarArchive } from '@/modules/grammar/services/grammarArchiveService'
import type { GrammarFamily } from '@/modules/grammar/types'

export const metadata: Metadata = {
  title: 'Your English',
  description:
    'The grammar rules that keep beating you, in your own sentences.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Top rows shown before the explicit show-all.
 *
 * The page is a statement, and 184 rows is not a statement. Forty is enough to
 * be uncomfortable and short enough to read.
 */
const DEFAULT_ROWS = 40
const ALL_ROWS = 400

/**
 * Your English: every rule that has caught you, quoting the sentence you wrote.
 *
 * This is the page the whole module is arguing towards. Nothing on it is
 * generated - the numbers are yours and the sentences are yours - which makes it
 * the one surface here that cannot be wrong about you.
 *
 * Nothing is sent anywhere. There is no sharing infrastructure in this project
 * and none was added for this; it is framed to be screenshotted and that is all.
 */
export default async function GrammarArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>
}) {
  const { all } = await searchParams
  const showAll = all === '1'

  if (!hasMongoDbUri())
    return (
      <ArchiveShell>
        <ComicPanel caption="Your English">
          <p className="text-base leading-7 font-semibold">
            Set MONGODB_URI to keep a record of your own mistakes.
          </p>
        </ComicPanel>
      </ArchiveShell>
    )

  const actorId = (await getPracticeActorId()) ?? ''

  await connectDatabase()

  const { rows, total } = await getGrammarArchive({
    actorId: actorId || null,
    limit: showAll ? ALL_ROWS : DEFAULT_ROWS,
  })

  return (
    <ArchiveShell>
      <ComicPanel
        edge="a"
        halftone
        tone="ink"
      >
        <div className="flex items-start gap-3">
          <Sensei expression="unimpressed" />
          <div className="grid min-w-0 gap-3">
            <h1 className="font-sans text-3xl leading-none font-black uppercase sm:text-4xl">
              Your English
            </h1>
            <SpeechBubble speaker="Sensei">
              {total === 0
                ? 'Nothing here yet. That is not the same as being right.'
                : `${total} ${total === 1 ? 'rule has' : 'rules have'} caught you. These are your own sentences. I did not write them.`}
            </SpeechBubble>
          </div>
        </div>
      </ComicPanel>

      {rows.length === 0 ? (
        <ComicPanel caption="Empty">
          <p className="text-base leading-7 font-semibold">
            Answer some drills and get some of them wrong. Then come back and
            read what you wrote.
          </p>
          <div className="flex flex-wrap gap-2">
            <MangaButton href="/grammar">Back To The Dojo</MangaButton>
            <MangaButton href="/grammar/points">Enter The Bestiary</MangaButton>
          </div>
        </ComicPanel>
      ) : (
        <ol className="grid gap-3">
          {rows.map((row, index) => (
            <li key={row.pointSlug}>
              <ComicPanel edge={index % 2 === 0 ? 'b' : 'c'}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link
                    className="font-sans text-xl leading-none font-black uppercase underline-offset-4 hover:underline"
                    href={`/grammar/points/${row.pointSlug}`}
                  >
                    {row.title}
                  </Link>
                  <span className="text-comic-danger font-sans text-sm font-black uppercase">
                    wrong {row.wrongCount}{' '}
                    {row.wrongCount === 1 ? 'time' : 'times'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-sans text-xs font-black uppercase">
                  <span className="border-comic-ink border-2 px-2 py-0.5">
                    {row.cefrLevel}
                  </span>
                  <span className="border-comic-ink border-2 px-2 py-0.5">
                    {GRAMMAR_FAMILY_LABELS[row.family as GrammarFamily]}
                  </span>
                  <span className="border-comic-ink border-2 px-2 py-0.5">
                    stage {row.recallStage}/7
                  </span>
                  {row.isUnverified ? (
                    <span className="border-comic-ink border-2 border-dashed px-2 py-0.5">
                      ghost - lesson unread
                    </span>
                  ) : null}
                </div>

                {row.quote ? (
                  <blockquote className="border-comic-danger grid gap-1 border-l-3 pl-3">
                    {row.quote.prompt ? (
                      <span className="text-manga-ink-soft text-sm leading-6 font-semibold">
                        {row.quote.prompt}
                      </span>
                    ) : null}
                    <span className="text-comic-danger text-lg leading-7 font-black">
                      &ldquo;{row.quote.userAnswer}&rdquo;
                    </span>
                    {row.quote.occurrences > 1 ? (
                      <span className="text-manga-ink-soft font-sans text-xs font-black uppercase">
                        written {row.quote.occurrences} times
                      </span>
                    ) : null}
                  </blockquote>
                ) : (
                  <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
                    No sentence on record for this one.
                  </p>
                )}
              </ComicPanel>
            </li>
          ))}
        </ol>
      )}

      {!showAll && total > rows.length ? (
        <MangaButton href="/grammar/archive?all=1">
          Show all {total}
        </MangaButton>
      ) : null}
    </ArchiveShell>
  )
}

function ArchiveShell({ children }: { children: React.ReactNode }) {
  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/grammar"
          authControl={<AuthControl />}
          subtitle="Your English"
        />
      }
    >
      <section className="grid gap-4 p-4 sm:p-6 lg:p-8">{children}</section>
    </MangaPageShell>
  )
}
