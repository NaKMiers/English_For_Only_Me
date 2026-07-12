import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import { VocabularyWordList } from '@/components/vocabulary/VocabularyWordList'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import {
  listVocabWordsForUser,
  parseVocabWordListView,
} from '@/modules/vocabulary/services/vocabWordListService'

export const metadata: Metadata = {
  title: 'Vocabulary Words',
  description: 'Filtered vocabulary word lists for learning and known words.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function VocabularyWordsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>
}) {
  const view = parseVocabWordListView((await searchParams).view)

  if (!hasMongoDbUri())
    return (
      <MangaPageShell
        topbar={
          <AppTopbar
            activeHref="/vocabulary"
            subtitle="Vocabulary memory spine"
            authControl={<AuthControl />}
          />
        }
      >
        <section className="p-4 sm:p-6 lg:p-8">
          <MangaPanel
            eyebrow="Vocabulary"
            title="Database needed"
          >
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              Set MONGODB_URI on the server before opening vocabulary lists.
            </p>
            <MangaButton href="/vocabulary">Back To Vocab</MangaButton>
          </MangaPanel>
        </section>
      </MangaPageShell>
    )

  const actorId = (await getPracticeActorId()) ?? ''

  await connectDatabase()

  const words = await listVocabWordsForUser({
    userId: actorId,
    view,
  })

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/vocabulary"
          subtitle="Vocabulary memory spine"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <VocabularyWordList
          activeView={view}
          key={view}
          words={words}
        />
      </section>
    </MangaPageShell>
  )
}
