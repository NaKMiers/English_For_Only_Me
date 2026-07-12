import type { Metadata } from 'next'
import { Trophy } from 'lucide-react'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { DictationGlobalStats } from '@/components/dictation/DictationGlobalStats'
import { TopicGrid } from '@/components/dictation/browse/TopicGrid'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  countNoTopicVideos,
  listTopicSummaries,
} from '@/modules/dictation/content/contentRepository'
import { getLatestCompletedVideoForUser } from '@/modules/dictation/content/progressRepository'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { getGlobalStatsForUser } from '@/modules/dictation/stats/globalStatsService'
import type {
  DictationGlobalStatsRecord,
  DictationTopicSummaryRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

export const metadata: Metadata = {
  title: 'All Topics',
  description:
    'Browse dictation practice topics by level and section - short stories, conversations, TOEIC, IELTS listening and more.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function BrowseFooter() {
  return (
    <div className="border-manga-black bg-manga-black text-manga-white border-t-3 px-5 py-4">
      <strong className="font-sans text-base font-black tracking-normal uppercase">
        English For Only Me
      </strong>
    </div>
  )
}

export default async function DictationPage() {
  let topics: DictationTopicSummaryRecord[] = []
  let globalStats: DictationGlobalStatsRecord | null = null
  let hasPracticeActor = false
  let latestCompletedVideo: DictationVideoApiRecord | null = null
  let noTopicCount = 0

  if (hasMongoDbUri()) {
    await connectDatabase()
    const actorId = await getPracticeActorId()
    hasPracticeActor = Boolean(actorId)
    ;[topics, noTopicCount, globalStats, latestCompletedVideo] =
      await Promise.all([
        listTopicSummaries(),
        countNoTopicVideos(),
        getGlobalStatsForUser(actorId ?? ''),
        actorId
          ? getLatestCompletedVideoForUser(actorId)
          : Promise.resolve(null),
      ])
  }

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Browse dictation topics"
          authControl={<AuthControl />}
        />
      }
      footer={<BrowseFooter />}
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <header className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PageTag tone="red">Listening</PageTag>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {latestCompletedVideo ? (
                <MangaButton
                  href={`/dictation/videos/${latestCompletedVideo.id}/results`}
                  tone="primary"
                  className="bg-manga-paper-soft min-h-10 px-3 py-1 text-xs hover:bg-manga-pale-red"
                  icon={
                    <Trophy
                      aria-hidden="true"
                      className="size-4"
                    />
                  }
                >
                  View Latest Results
                </MangaButton>
              ) : null}
              <Link
                href="/dictation/favorites"
                className="text-manga-red text-sm font-black hover:underline"
              >
                ★ Favorites
              </Link>
            </div>
          </div>
          <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase">
            All topics
          </h1>
          <p className="text-manga-ink-soft max-w-2xl text-sm leading-6">
            {hasPracticeActor
              ? 'Pick a topic, then a section, then continue building your listening history.'
              : 'Pick a topic, then a section, then practice a lesson. Sign in to save your progress and favorites.'}
          </p>
        </header>
        <TopicGrid
          topics={topics}
          noTopicCount={noTopicCount}
        />
        {globalStats ? (
          <div className="border-manga-black/20 mt-4 border-t-2 pt-8">
            <DictationGlobalStats stats={globalStats} />
          </div>
        ) : null}
      </section>
    </MangaPageShell>
  )
}
