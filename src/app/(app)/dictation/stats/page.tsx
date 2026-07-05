import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { DictationGlobalStats } from '@/components/dictation/DictationGlobalStats'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import { getGlobalStatsForOwner } from '@/modules/dictation/stats/globalStatsService'

export const metadata: Metadata = {
  title: 'Dictation Stats',
  description: 'Whole-module Dictation Lab progress and review direction.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Page() {
  if (!hasMongoDbUri())
    return (
      <MangaPageShell
        topbar={
          <AppTopbar
            activeHref="/dictation"
            subtitle="Dictation Lab listening module"
          />
        }
      >
        <section className="p-4 sm:p-6 lg:p-8">
          <MangaPanel
            eyebrow="Stats"
            title="MongoDB is not configured"
          >
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              Set MONGODB_URI on the server before opening whole-module
              Dictation stats.
            </p>
            <MangaButton href="/dictation">Back To Dictation Lab</MangaButton>
          </MangaPanel>
        </section>
      </MangaPageShell>
    )

  const ownerId = await getCurrentOwnerId()

  await connectDatabase()

  const stats = await getGlobalStatsForOwner(ownerId)

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab listening module"
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <MangaPanel
          eyebrow="Stats"
          title="Dictation dashboard"
          action={
            <MangaButton
              href="/dictation"
              tone="paper"
            >
              Back To Lab
            </MangaButton>
          }
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            Whole-module progress across saved videos, attempts, weak words,
            review items, and practice time. No fake IELTS band score here.
          </p>
        </MangaPanel>

        <DictationGlobalStats stats={stats} />
      </section>
    </MangaPageShell>
  )
}
