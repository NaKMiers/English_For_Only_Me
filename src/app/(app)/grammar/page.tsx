import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { GrammarDiagnosticLauncher } from '@/components/grammar/GrammarDiagnosticLauncher'
import { GrammarProgressMap } from '@/components/grammar/GrammarProgressMap'
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
 * Phase 1 landing page. Deliberately not the daily-recall dashboard yet: drills
 * and the due queue land in Phase 2, and the progress map in Phase 4. What this
 * page can honestly show today is coverage and review state.
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
              load the 162-point taxonomy.
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
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <MangaPanel
          eyebrow="Grammar"
          title="The whole map"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            Every grammar point carries two independent axes: the CEFR level
            where you meet it, and how hard it actually is to get right.
            Articles are A1 and brutal. Future perfect continuous is C1 and
            mechanical. The browse list is sorted by Vietnamese interference
            first, so the points that cost you marks come up before the ones
            that merely look advanced.
          </p>
          <MangaButton href="/grammar/points">Browse Grammar Map</MangaButton>
        </MangaPanel>

        <GrammarRecallLauncher dueCount={stats.dueCount} />

        {stats.learningCount === 0 && stats.untouchedCount > 0 ? (
          <GrammarDiagnosticLauncher untouchedCount={stats.untouchedCount} />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Streak"
            value={`${stats.streakDays}d`}
            detail={`${stats.reviewedTodayCount} answered today`}
          />
          <MetricTile
            label="Learning"
            value={String(stats.learningCount)}
            detail={`${stats.dueCount} due now`}
          />
          <MetricTile
            label="Mastered"
            value={`${stats.masteredCount}/${total}`}
          />
          <MetricTile
            label="Lessons written"
            value={`${withLesson}/${total}`}
            detail={`${reviewed} human reviewed`}
          />
        </div>

        <GrammarProgressMap progressCells={stats.progressCells} />

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
