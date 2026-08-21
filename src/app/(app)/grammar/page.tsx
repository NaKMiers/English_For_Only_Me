import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { Sensei } from '@/components/grammar/cast/Sensei'
import { ComicPanel } from '@/components/grammar/comic/ComicPanel'
import { SpeechBubble } from '@/components/grammar/comic/SpeechBubble'
import { GrammarDiagnosticLauncher } from '@/components/grammar/GrammarDiagnosticLauncher'
import { GrammarDungeonMap } from '@/components/grammar/GrammarDungeonMap'
import { GrammarRecallLauncher } from '@/components/grammar/GrammarRecallLauncher'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { getGrammarStatsForActor } from '@/modules/grammar/stats/grammarStatsService'

export const metadata: Metadata = {
  title: 'Grammar',
  description:
    'The complete English grammar curriculum, grouped by CEFR level and by real difficulty.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TOPBAR_SUBTITLE = 'Grammar map by level and difficulty'

/**
 * The dojo.
 *
 * The sensei opens, states the premise in his own voice, and the dungeon map
 * carries the numbers. The four `MetricTile`s that used to sit here are gone:
 * a dashboard tells a learner how they are doing, which is not the same as
 * telling them what to do next, and four equal-weight tiles said neither
 * loudly enough to act on.
 */
export default async function GrammarPage() {
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
              Set MONGODB_URI, then run <code>bun run grammar:seed</code> to
              load the taxonomy.
            </p>
            <MangaButton href="/">Back To Study Desk</MangaButton>
          </MangaPanel>
        </section>
      </MangaPageShell>
    )

  const actorId = (await getPracticeActorId()) ?? ''

  await connectDatabase()

  const [withLesson, reviewed, stats] = await Promise.all([
    GrammarPointModel.countDocuments({
      explanation: { $ne: null },
      mergedInto: null,
    }),
    GrammarPointModel.countDocuments({
      mergedInto: null,
      reviewStatus: 'reviewed',
    }),
    getGrammarStatsForActor({ actorId }),
  ])
  const total = stats.totalPoints

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
      <section className="grid gap-4 p-4 sm:p-6 lg:p-8">
        <ComicPanel
          edge="a"
          halftone
          tone="ink"
        >
          <div className="flex items-start gap-3">
            <Sensei expression="severe" />
            <div className="grid min-w-0 gap-3">
              <h1 className="font-sans text-3xl leading-none font-black uppercase sm:text-4xl">
                {total} rules
              </h1>
              <SpeechBubble speaker="Sensei">
                {reviewed === 0
                  ? `${total} rules. Not one of them checked by a human, including me. Read them anyway - and doubt the edges.`
                  : `${total} rules. ${reviewed} of them read by a human. The rest are still guesses.`}
              </SpeechBubble>
              <p className="text-sm leading-6 font-semibold">
                Two axes, not one: the level where you meet a rule, and how hard
                it is to actually get right. Articles are A1 and brutal. Future
                perfect continuous is C1 and mechanical. Everything here is
                ordered by Vietnamese interference first, so what costs you
                marks comes before what merely looks advanced.
              </p>
            </div>
          </div>
        </ComicPanel>

        <GrammarRecallLauncher dueCount={stats.dueCount} />

        {stats.learningCount === 0 && stats.untouchedCount > 0 ? (
          <GrammarDiagnosticLauncher untouchedCount={stats.untouchedCount} />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DojoTally
            detail={`${stats.reviewedTodayCount} answered today`}
            label="Days in the dojo"
            value={`${stats.streakDays}`}
          />
          <DojoTally
            detail={`${stats.dueCount} waiting for you now`}
            label="Rules still standing"
            value={String(stats.learningCount)}
          />
          <DojoTally
            detail="beaten, at least once"
            label="Rules put down"
            value={`${stats.masteredCount}/${total}`}
          />
          <DojoTally
            detail={
              reviewed === 0
                ? 'every one of them a ghost'
                : `${reviewed} verified by a human`
            }
            label="Lessons written"
            value={`${withLesson}/${total}`}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <MangaButton href="/grammar/points">Enter The Bestiary</MangaButton>
          <MangaButton href="/grammar/archive">Your English</MangaButton>
        </div>

        <GrammarDungeonMap progressCells={stats.progressCells} />

        {total === 0 ? (
          <MangaPanel
            eyebrow="Empty"
            title="Nothing seeded yet"
          >
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              Run <code>bun run grammar:seed</code> to load the taxonomy, then{' '}
              <code>bun run grammar:generate</code> to write the lessons.
            </p>
          </MangaPanel>
        ) : null}
      </section>
    </MangaPageShell>
  )
}

/**
 * An in-world tally.
 *
 * Replaces `MetricTile` on this page only. The tiles are correct elsewhere in
 * the product; here they made the dojo read like an analytics dashboard, and
 * "Streak 4d" says less to a learner than "Days in the dojo: 4".
 */
function DojoTally({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="border-comic-ink bg-comic-paper grid gap-1 border-3 p-3 shadow-[4px_4px_0_var(--manga-offset)]">
      <span className="text-manga-ink-soft font-sans text-[0.65rem] leading-none font-black tracking-[0.12em] uppercase">
        {label}
      </span>
      <span className="font-sans text-3xl leading-none font-black">
        {value}
      </span>
      <span className="text-manga-ink-soft text-xs leading-5 font-semibold">
        {detail}
      </span>
    </div>
  )
}
