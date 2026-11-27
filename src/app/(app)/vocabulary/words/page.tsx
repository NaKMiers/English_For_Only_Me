import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { ContentPanel } from '@/components/common/ContentPanel'
import { ActionButton } from '@/components/ui/ActionButton'
import { VocabularyWordList } from '@/components/vocabulary/VocabularyWordList'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { parseVocabWordListQuery } from '@/modules/vocabulary/services/vocabularyRouteDecisions'
import { listVocabWordsForUser } from '@/modules/vocabulary/services/vocabWordListService'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.vocabulary.page.wordsMetaTitle,
    description: t.vocabulary.page.wordsMetaDescription,
  }
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
  const t = await getMessages()

  if (!hasMongoDbUri())
    return (
      <PageShell
        topbar={
          <AppTopbar
            activeHref="/vocabulary"
            subtitle={t.vocabulary.page.subtitle}
            authControl={<AuthControl />}
          />
        }
      >
        <section className="p-4 sm:p-6 lg:p-8">
          <ContentPanel
            eyebrow={t.vocabulary.page.eyebrow}
            title={t.vocabulary.page.dbNeededTitle}
          >
            <p className="text-ink-soft text-base leading-7 font-normal">
              {t.vocabulary.page.dbNeededWords}
            </p>
            <ActionButton href="/vocabulary">
              {t.vocabulary.page.backToVocab}
            </ActionButton>
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
          subtitle={t.vocabulary.page.subtitle}
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
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
