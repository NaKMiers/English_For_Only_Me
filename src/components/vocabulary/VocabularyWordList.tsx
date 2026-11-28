'use client'

import {
  BookA,
  BookOpen,
  CalendarClock,
  Check,
  PlayCircle,
  SearchX,
  Sprout,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { InlineNotice } from '@/components/common/InlineNotice'
import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/journey/EmptyState'
import { StepDots } from '@/components/journey/StepDots'
import { ActionButton } from '@/components/ui/ActionButton'
import { Input } from '@/components/ui/input'
import { useLocale, useMessages } from '@/i18n/client'
import { INTL_LOCALES, type Locale } from '@/i18n/config'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages/en'
import { cn } from '@/lib/utils'
import { VOCAB_RECALL_HREF } from '@/modules/vocabulary/constants'
import type {
  VocabWordListRecord,
  VocabWordListView,
} from '@/modules/vocabulary/types'
import {
  getEnglishDefinition,
  getRequiredVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'

import { VocabTermHeader } from './VocabTermHeader'
import {
  buildOptimisticUserItem,
  createEntryWriteTracker,
  enqueueVocabItemStatus,
  type VocabMarkStatus,
} from './vocabItemWrites'
import {
  buildVocabWordListHref,
  replaceWordListRow,
  restoreWordListRow,
  wordMatchesView,
} from './vocabWordListRows'

interface Props {
  activeView: VocabWordListView
  page: number
  perPage: number
  /** The word search, a term prefix (server-side). */
  q?: string
  total: number
  words: VocabWordListRecord[]
}

const VIEW_TABS: Array<{
  href: string
  view: VocabWordListView
}> = [
  {
    href: '/vocabulary/words?view=learning',
    view: 'learning',
  },
  {
    href: '/vocabulary/words?view=dueToday',
    view: 'dueToday',
  },
  {
    href: '/vocabulary/words?view=alreadyKnow',
    view: 'alreadyKnow',
  },
  {
    href: '/vocabulary/words?view=mastered',
    view: 'mastered',
  },
  {
    href: '/vocabulary/words?view=knownTotal',
    view: 'knownTotal',
  },
]

/** Status dot per view, the same colours as the dashboard's status strip. */
const VIEW_TAB_CLASS_NAMES: Record<VocabWordListView, string> = {
  alreadyKnow: 'bg-accent-orange',
  dueToday: 'bg-brand',
  knownTotal: 'bg-accent-green',
  learning: 'bg-accent-blue',
  mastered: 'bg-accent-purple',
}

// Offline, or while a lane keeps retrying, the outbox never drains. A page
// refill that waits on it goes ahead after this long.
const REFILL_IDLE_TIMEOUT_MS = 8000

function getVietnamesePreview(word: VocabWordListRecord, fallback: string) {
  return getRequiredVietnameseMeaning(word.entry, fallback)
}

function getDefinitionPreview(word: VocabWordListRecord) {
  return getEnglishDefinition(word.entry)
}

function formatDate(value: Date | string | null, locale: Locale) {
  if (!value) return null

  return new Intl.DateTimeFormat(INTL_LOCALES[locale]).format(new Date(value))
}

function getStatusMeta(
  word: VocabWordListRecord,
  t: Messages['vocabulary'],
  locale: Locale
) {
  const stage = word.item.recallStage

  if (word.item.status === 'learning') {
    const date = formatDate(word.item.dueAt, locale)

    return date
      ? format(t.wordList.stageDue, { date, stage })
      : format(t.wordList.stage, { stage })
  }

  if (word.item.status === 'mastered') {
    const date = formatDate(word.item.masteredAt, locale)

    return date ? format(t.wordList.masteredOn, { date }) : t.wordList.mastered
  }

  if (word.item.status === 'alreadyKnow') {
    const date = formatDate(word.item.knownAt, locale)

    return date ? format(t.wordList.knownOn, { date }) : t.wordList.alreadyKnown
  }

  return t.itemStatus[word.item.status]
}

function getStatusIcon(word: VocabWordListRecord) {
  if (word.item.status === 'mastered') return <Trophy className="size-3.5" />
  if (word.item.status === 'alreadyKnow') return <Check className="size-3.5" />

  return <CalendarClock className="size-3.5" />
}

/** Recall steps a learning word climbs before it is mastered. */
const RECALL_STEPS = 7

interface PendingRow {
  index: number
  word: VocabWordListRecord
}

export function VocabularyWordList({
  activeView,
  page,
  perPage,
  q = '',
  total,
  words,
}: Props) {
  const messages = useMessages()
  const t = messages.vocabulary
  const locale = useLocale()
  const router = useRouter()
  const outbox = useClientOutbox()
  const [wordItems, setWordItems] = useState(words)
  // The server rows `wordItems` started from. A refresh brings a new list
  // (same page, rows already shifted up), which replaces the local one.
  const [serverWords, setServerWords] = useState(words)
  const [search, setSearch] = useState(q)
  // A failed move shows on its own row (put back where it was), not above
  // the list.
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const trackerRef = useRef(createEntryWriteTracker<PendingRow>())
  const refillScheduledRef = useRef(false)

  if (serverWords !== words) {
    setServerWords(words)
    setWordItems(words)
  }

  // Rows moved out of this view by a status change leave the page right away,
  // so the count follows them instead of waiting for a reload.
  const removedCount = Math.max(0, words.length - wordItems.length)
  const visibleTotal = Math.max(0, total - removedCount)
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  const offset = (page - 1) * perPage
  const firstItem = wordItems.length === 0 ? 0 : offset + 1
  const lastItem = offset + wordItems.length

  function goTo(nextPage: number) {
    router.push(
      buildVocabWordListHref({
        page: Math.min(Math.max(nextPage, 1), Math.max(pageCount, 1)),
        q,
        view: activeView,
      })
    )
  }

  // Debounced search: the server filters the view by term prefix.
  useEffect(() => {
    if (search.trim() === q) return

    const timer = setTimeout(
      () =>
        router.replace(
          buildVocabWordListHref({
            page: 1,
            q: search.trim(),
            view: activeView,
          })
        ),
      300
    )

    return () => clearTimeout(timer)
  }, [activeView, q, router, search])

  /**
   * Rows that left this view shift every later word up the server's list, so
   * page N+1 of the new list would skip as many words as left. Once the
   * writes land, re-read this page: it refills with the shifted-up words and
   * Next then continues from the right place.
   */
  function scheduleRefill() {
    if (refillScheduledRef.current) return

    refillScheduledRef.current = true
    void outbox.whenIdle({ timeoutMs: REFILL_IDLE_TIMEOUT_MS }).then(() => {
      refillScheduledRef.current = false
      router.refresh()
    })
  }

  async function updateWordStatus(
    word: VocabWordListRecord,
    status: VocabMarkStatus
  ) {
    const entryId = word.entry.id
    const optimisticWord = {
      ...word,
      item: buildOptimisticUserItem({
        entry: { entry: word.entry, userItem: word.item },
        source: 'manual',
        status,
      }),
    }
    // Kept for every state this press records, so a later rollback to a
    // saved state still lands the row where it was on screen.
    const index = wordItems.findIndex(row => row.entry.id === entryId)
    const ticket = trackerRef.current.begin(entryId, { index, word })

    setRowErrors(({ [entryId]: _cleared, ...rest }) => rest)
    // The row leaving (or changing in) the view says it worked.
    setWordItems(rows =>
      replaceWordListRow({ next: optimisticWord, rows, view: activeView })
    )

    const outcome = await enqueueVocabItemStatus(outbox, {
      source: 'manual',
      status,
      vocabEntryId: entryId,
    })
    const settled = trackerRef.current.settle(
      entryId,
      ticket,
      outcome.kind === 'saved'
        ? {
            kind: 'saved',
            state: { index, word: { ...word, item: outcome.item } },
          }
        : outcome
    )

    if (settled.kind === 'apply')
      setWordItems(rows =>
        // Only reconcile a row that is still on screen; one that moved out
        // of this view stays out.
        rows.some(row => row.entry.id === entryId)
          ? replaceWordListRow({
              next: settled.state.word,
              rows,
              view: activeView,
            })
          : rows
      )

    if (!wordMatchesView(optimisticWord, activeView)) scheduleRefill()

    if (settled.kind === 'rollback' && outcome.kind === 'failed') {
      const { index: previousIndex, word: previousWord } = settled.state

      setWordItems(rows =>
        restoreWordListRow({
          index: previousIndex,
          rows,
          view: activeView,
          word: previousWord,
        })
      )
      setRowErrors(errors => ({ ...errors, [entryId]: outcome.error }))
    }
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        breadcrumb={{
          items: [
            { href: '/vocabulary', label: t.dashboard.title },
            { label: t.views[activeView] },
          ],
          label: messages.common.journey.breadcrumb,
        }}
        icon={<BookA />}
        iconClassName="bg-pastel-mint text-accent-green"
        inTopbar
        subtitle={plural(t.wordList.count, visibleTotal)}
        title={t.views[activeView]}
      />

      <nav
        aria-label={t.wordList.viewsNav}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {VIEW_TABS.map(tab => (
          <Link
            key={tab.view}
            className={cn(
              'soft-press flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium',
              tab.view === activeView
                ? 'border-cta bg-cta text-cta-fg'
                : 'border-line bg-surface text-ink hover:bg-tint-soft hover-pop'
            )}
            href={buildVocabWordListHref({ page: 1, q, view: tab.view })}
            aria-current={tab.view === activeView ? 'page' : undefined}
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-2 rounded-full',
                VIEW_TAB_CLASS_NAMES[tab.view]
              )}
            />
            {t.views[tab.view]}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={t.wordList.searchLabel}
          className="border-line bg-surface rounded-control min-h-11 min-w-48 flex-1 border px-3 font-sans text-sm"
          onChange={event => setSearch(event.target.value)}
          placeholder={t.wordList.search}
          type="search"
          value={search}
        />
        {activeView === 'dueToday' && visibleTotal > 0 ? (
          <ActionButton
            href={VOCAB_RECALL_HREF}
            icon={<BookOpen aria-hidden="true" />}
            tone="ink"
          >
            {t.launcher.start}
          </ActionButton>
        ) : null}
      </div>

      {wordItems.length > 0 ? (
        <ul className="border-line bg-surface rounded-panel motion-stagger divide-line grid divide-y border">
          {wordItems.map(word => (
            <li
              key={word.item.id}
              className="grid min-w-0 gap-2 px-3 py-3 sm:px-4 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_auto] md:items-center md:gap-4"
            >
              <div className="grid min-w-0 gap-1">
                <VocabTermHeader
                  entry={word.entry}
                  headingClassName="text-lg"
                />
                <p className="text-ink-soft flex flex-wrap items-center gap-x-2 text-xs">
                  {word.item.status === 'learning' ? (
                    <StepDots
                      doneClassName="bg-accent-green"
                      done={word.item.recallStage}
                      label={format(t.wordList.stage, {
                        stage: word.item.recallStage,
                      })}
                      total={RECALL_STEPS}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="text-ink"
                    >
                      {getStatusIcon(word)}
                    </span>
                  )}
                  <span>{getStatusMeta(word, t, locale)}</span>
                </p>
              </div>

              <div className="grid min-w-0 gap-0.5">
                <p className="line-clamp-1 text-sm leading-6 font-medium">
                  {getVietnamesePreview(word, t.word.needsMeaning)}
                </p>
                <p className="text-ink-soft line-clamp-2 text-xs leading-5">
                  {getDefinitionPreview(word)}
                </p>
                <p className="text-ink-soft flex min-w-0 flex-wrap items-center gap-x-2 text-xs">
                  <span className="tabular-nums">
                    {word.entry.frequencyRank
                      ? `#${word.entry.frequencyRank}`
                      : t.enrichmentStatus[word.entry.enrichmentStatus]}
                  </span>
                  <span>{t.sources[word.item.source]}</span>
                  {word.sourceVideo ? (
                    <Link
                      className="soft-press hover-pop hover:text-brand rounded-tag flex min-w-0 items-center gap-1"
                      href={`/dictation/videos/${word.sourceVideo.id}/practice`}
                      title={word.sourceVideo.title}
                    >
                      <PlayCircle
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                      <span className="max-w-64 truncate">
                        {format(t.wordList.fromVideo, {
                          title: word.sourceVideo.title,
                        })}
                      </span>
                    </Link>
                  ) : null}
                </p>
              </div>

              {/* Only the move that changes something: a learning word can
                  be marked known, a known word can be learnt again. */}
              <div className="flex md:justify-end">
                {word.item.status === 'learning' ? (
                  <ActionButton
                    className="min-w-0 px-4 text-xs [&>span:last-child]:whitespace-nowrap"
                    icon={<Check className="size-4" />}
                    onClick={() => updateWordStatus(word, 'alreadyKnow')}
                    tone="paper"
                  >
                    {t.marks.alreadyKnow}
                  </ActionButton>
                ) : (
                  <ActionButton
                    className="min-w-0 px-4 text-xs [&>span:last-child]:whitespace-nowrap"
                    icon={<BookOpen className="size-4" />}
                    onClick={() => updateWordStatus(word, 'shouldLearn')}
                  >
                    {t.wordList.learnIt}
                  </ActionButton>
                )}
              </div>
              {rowErrors[word.entry.id] ? (
                <InlineNotice
                  className="md:col-span-3"
                  tone="error"
                >
                  {rowErrors[word.entry.id]}
                </InlineNotice>
              ) : null}
            </li>
          ))}
        </ul>
      ) : q ? (
        <EmptyState
          action={{
            href: buildVocabWordListHref({ page: 1, view: activeView }),
            label: t.wordList.clearSearch,
          }}
          icon={<SearchX />}
          title={format(t.wordList.noMatches, { q })}
        />
      ) : (
        <EmptyState
          action={{
            href: '/vocabulary#vocab-explore',
            label: t.garden.plantAction,
          }}
          body={t.wordList.emptyBody}
          icon={<Sprout />}
          title={t.wordList.emptyTitle}
        />
      )}

      {pageCount > 1 ? (
        <nav
          aria-label={t.wordList.pagerNav}
          className="flex items-center justify-between gap-2"
        >
          {/* The ends of the list: a spacer, not a button that cannot be
              pressed. */}
          {page > 1 ? (
            <ActionButton
              onClick={() => goTo(page - 1)}
              tone="paper"
            >
              {t.wordList.prev}
            </ActionButton>
          ) : (
            <span
              aria-hidden="true"
              className="min-w-20"
            />
          )}
          <span className="text-sm tabular-nums">
            {firstItem}-{lastItem} / {visibleTotal}
          </span>
          {page < pageCount ? (
            <ActionButton
              onClick={() => goTo(page + 1)}
              tone="paper"
            >
              {messages.common.actions.next}
            </ActionButton>
          ) : (
            <span
              aria-hidden="true"
              className="min-w-20"
            />
          )}
        </nav>
      ) : null}
    </div>
  )
}
