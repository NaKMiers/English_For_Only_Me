import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { ContentPanel } from '@/components/common/ContentPanel'
import { ActionButton } from '@/components/ui/ActionButton'
import { VocabularyWordList } from '@/components/vocabulary/VocabularyWordList'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { parseVocabWordListQuery } from '@/modules/vocabulary/services/vocabularyRouteDecisions'
import { listVocabWordsForUser } from '@/modules/vocabulary/services/vocabWordListService'

export const metadata: Metadata = {
  title: 'Vocabulary Words',
  description: 'Filtered vocabulary word lists for learning and known words.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function VocabularyWordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[]
    perPage?: string | string[]
    view?: string | string[]
  }>
}) {
  const { page, perPage, view } = parseVocabWordListQuery(await searchParams)

  if (!hasMongoDbUri())
    return (
      <PageShell
        topbar={
          <AppTopbar
            activeHref="/vocabulary"
            subtitle="Vocabulary memory spine"
            authControl={<AuthControl />}
          />
        }
      >
        <section className="px-4 pb-6 md:pr-6 md:pl-0">
          <ContentPanel
            eyebrow="Vocabulary"
            title="Database needed"
          >
            <p className="text-ink-soft text-base leading-7 font-normal">
              Set MONGODB_URI on the server before opening vocabulary lists.
            </p>
            <ActionButton href="/vocabulary">Back To Vocab</ActionButton>
          </ContentPanel>
        </section>
      </PageShell>
    )

  const [actorId] = await Promise.all([getPracticeActorId(), connectDatabase()])
  const wordPage = await listVocabWordsForUser({
    page,
    perPage,
    userId: actorId ?? '',
    view,
  })

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/vocabulary"
          subtitle="Vocabulary memory spine"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <VocabularyWordList
          activeView={view}
          key={`${view}:${page}:${perPage}`}
          page={wordPage.page}
          perPage={wordPage.perPage}
          total={wordPage.total}
          words={wordPage.words}
        />
      </section>
    </PageShell>
  )
}
