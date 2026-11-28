import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
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
    q?: string | string[]
    view?: string | string[]
  }>
}) {
  const { page, perPage, q, view } = parseVocabWordListQuery(await searchParams)
  const t = await getMessages()

  if (!hasMongoDbUri())
    return (
      <PageShell
        topbar={
          <AppTopbar
            activeHref="/vocabulary"
            subtitle={t.vocabulary.page.subtitle}
          />
        }
      >
        <section className="px-4 pb-6 md:pr-6 md:pl-0">
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
    search: q,
    userId: actorId ?? '',
    view,
  })

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/vocabulary"
          page={{
            breadcrumb: [
              { href: '/vocabulary', label: t.vocabulary.dashboard.title },
              { label: t.vocabulary.views[view] },
            ],
            module: 'vocabulary',
            title: t.vocabulary.views[view],
          }}
          subtitle={t.vocabulary.page.subtitle}
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <VocabularyWordList
          activeView={view}
          key={`${view}:${page}:${perPage}:${q}`}
          page={wordPage.page}
          perPage={wordPage.perPage}
          q={q}
          total={wordPage.total}
          words={wordPage.words}
        />
      </section>
    </PageShell>
  )
}
