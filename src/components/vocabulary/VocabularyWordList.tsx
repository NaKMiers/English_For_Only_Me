'use client'

import {
  AlertCircle,
  ArrowLeft,
  BookA,
  BookOpen,
  CalendarClock,
  Check,
  PlayCircle,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'

import { ContentPanel } from '@/components/common/ContentPanel'
import { PageHeader } from '@/components/common/PageHeader'
import { Input } from '@/components/ui/input'
import { ActionButton } from '@/components/ui/ActionButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
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
  total: number
  words: VocabWordListRecord[]
}

const VIEW_TABS: Array<{
  href: string
  label: string
  view: VocabWordListView
}> = [
  {
    href: '/vocabulary/words?view=learning',
    label: 'Learning',
    view: 'learning',
  },
  {
    href: '/vocabulary/words?view=dueToday',
    label: 'Due Today',
    view: 'dueToday',
  },
  {
    href: '/vocabulary/words?view=alreadyKnow',
    label: 'Already Know',
    view: 'alreadyKnow',
  },
  {
    href: '/vocabulary/words?view=mastered',
    label: 'Mastered',
    view: 'mastered',
  },
  {
    href: '/vocabulary/words?view=knownTotal',
    label: 'Known Total',
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

const VIEW_LABELS: Record<VocabWordListView, string> = {
  alreadyKnow: 'Already Know',
  dueToday: 'Due Today',
  knownTotal: 'Known Total',
  learning: 'Learning',
  mastered: 'Mastered',
}

const PER_PAGE_OPTIONS = [5, 10, 20, 30, 50, 100, 200] as const

// Offline, or while a lane keeps retrying, the outbox never drains. A page
// refill that waits on it goes ahead after this long.
const REFILL_IDLE_TIMEOUT_MS = 8000

function getVietnamesePreview(word: VocabWordListRecord) {
  return getRequiredVietnameseMeaning(word.entry)
}

function getDefinitionPreview(word: VocabWordListRecord) {
  return getEnglishDefinition(word.entry)
}

function formatDate(value: Date | string | null) {
  if (!value) return null

  return new Date(value).toLocaleDateString()
}

function getStatusMeta(word: VocabWordListRecord) {
  if (word.item.status === 'learning')
    return formatDate(word.item.dueAt)
      ? `Stage ${word.item.recallStage}/7 - due ${formatDate(word.item.dueAt)}`
      : `Stage ${word.item.recallStage}/7`

  if (word.item.status === 'mastered')
    return formatDate(word.item.masteredAt)
      ? `Mastered ${formatDate(word.item.masteredAt)}`
      : 'Mastered'

  if (word.item.status === 'alreadyKnow')
    return formatDate(word.item.knownAt)
      ? `Known ${formatDate(word.item.knownAt)}`
      : 'Already known'

  return word.item.status
}

function getStatusIcon(word: VocabWordListRecord) {
  if (word.item.status === 'learning') return <BookOpen className="size-3.5" />
  if (word.item.status === 'mastered') return <Trophy className="size-3.5" />
  if (word.item.status === 'alreadyKnow') return <Check className="size-3.5" />

  return <CalendarClock className="size-3.5" />
}

interface PendingRow {
  index: number
  word: VocabWordListRecord
}

export function VocabularyWordList({
  activeView,
  page,
  perPage,
  total,
  words,
}: Props) {
  const router = useRouter()
  const outbox = useClientOutbox()
  const [wordItems, setWordItems] = useState(words)
  // The server rows `wordItems` started from. A refresh brings a new list
  // (same page, rows already shifted up), which replaces the local one.
  const [serverWords, setServerWords] = useState(words)
  const [customPageSize, setCustomPageSize] = useState(String(perPage))
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  function goTo(nextPage: number, nextPerPage = perPage) {
    router.push(
      buildVocabWordListHref({
        page: Math.min(Math.max(nextPage, 1), Math.max(pageCount, 1)),
        perPage: nextPerPage,
        view: activeView,
      })
    )
  }

  function updatePageSize(value: number) {
    const nextPageSize = Math.min(
      Math.max(1, Math.floor(value)),
      PER_PAGE_OPTIONS[PER_PAGE_OPTIONS.length - 1]
    )

    setCustomPageSize(String(nextPageSize))
    if (nextPageSize !== perPage)
      router.push(
        buildVocabWordListHref({
          page: 1,
          perPage: nextPageSize,
          view: activeView,
        })
      )
  }

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

    setError(null)
    setWordItems(rows =>
      replaceWordListRow({ next: optimisticWord, rows, view: activeView })
    )
    setMessage(
      status === 'shouldLearn'
        ? `"${word.entry.term}" moved to Learning.`
        : `"${word.entry.term}" marked as Already Know.`
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
      setMessage(null)
      setError(outcome.error)
    }
  }

  const hasPresetPageSize = PER_PAGE_OPTIONS.some(option => option === perPage)

  return (
    <div className="grid gap-4">
      <PageHeader
        actions={
          <ActionButton
            href="/vocabulary"
            icon={<ArrowLeft aria-hidden="true" />}
            tone="paper"
          >
            Back To Vocab
          </ActionButton>
        }
        icon={<BookA />}
        iconClassName="bg-pastel-mint text-accent-green"
        subtitle={`${visibleTotal} words in this view.`}
        title={VIEW_LABELS[activeView]}
      />

      <nav
        aria-label="Vocabulary word views"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {VIEW_TABS.map(tab => (
          <Link
            key={tab.view}
            className={cn(
              'soft-press flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium',
              tab.view === activeView
                ? 'border-cta bg-cta text-cta-fg'
                : 'border-line bg-surface text-ink hover:bg-tint-soft'
            )}
            href={tab.href}
            aria-current={tab.view === activeView ? 'page' : undefined}
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-2 rounded-full',
                VIEW_TAB_CLASS_NAMES[tab.view]
              )}
            />
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="border-line bg-surface rounded-panel grid gap-3 border p-2.5 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-ink-soft shrink-0 text-xs">Per page</span>
            <Select
              value={String(perPage)}
              onValueChange={value => {
                if (!value) return
                updatePageSize(Number(value))
              }}
            >
              <SelectTrigger
                aria-label="Words per page"
                className="w-full sm:w-24"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hasPresetPageSize ? null : (
                  <SelectItem value={String(perPage)}>{perPage}</SelectItem>
                )}
                {PER_PAGE_OPTIONS.map(option => (
                  <SelectItem
                    key={option}
                    value={String(option)}
                  >
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-soft shrink-0 text-xs">Custom</span>
            <Input
              aria-label="Custom words per page"
              className="border-line bg-surface rounded-control h-10 w-full border px-3 font-sans sm:w-20"
              min={1}
              onBlur={() => updatePageSize(Number(customPageSize) || 1)}
              onChange={event => setCustomPageSize(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter')
                  updatePageSize(Number(customPageSize) || 1)
              }}
              type="number"
              value={customPageSize}
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <ActionButton
            className="min-h-10"
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
            tone="paper"
          >
            Prev
          </ActionButton>
          <span className="text-sm tabular-nums">
            {firstItem}-{lastItem} / {visibleTotal}
          </span>
          <ActionButton
            className="min-h-10"
            disabled={page >= pageCount}
            onClick={() => goTo(page + 1)}
            tone="paper"
          >
            Next
          </ActionButton>
        </div>
      </div>

      {message ? (
        <div
          aria-live="polite"
          className="border-line bg-surface rounded-control border p-3 text-sm"
        >
          {message}
        </div>
      ) : null}
      {error ? (
        <div
          className="border-danger/30 bg-danger-soft rounded-control flex items-center gap-2 border p-3 text-sm"
          role="alert"
        >
          <AlertCircle
            aria-hidden="true"
            className="text-danger size-4 shrink-0"
          />
          {error}
        </div>
      ) : null}

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
                  <span
                    aria-hidden="true"
                    className="text-ink"
                  >
                    {getStatusIcon(word)}
                  </span>
                  <span>{getStatusMeta(word)}</span>
                  <span className="tabular-nums">
                    {word.entry.frequencyRank
                      ? `#${word.entry.frequencyRank}`
                      : word.entry.enrichmentStatus}
                  </span>
                </p>
              </div>

              <div className="grid min-w-0 gap-0.5">
                <p className="line-clamp-1 text-sm leading-6 font-medium">
                  {getVietnamesePreview(word)}
                </p>
                <p className="text-ink-soft line-clamp-2 text-xs leading-5">
                  {getDefinitionPreview(word)}
                </p>
                <p className="text-ink-soft flex min-w-0 flex-wrap items-center gap-x-2 text-[11px]">
                  <span>{word.item.source}</span>
                  {word.sourceVideo ? (
                    <a
                      className="hover:text-brand flex min-w-0 items-center gap-1"
                      href={`/dictation/videos/${word.sourceVideo.id}/practice`}
                      rel="noopener noreferrer"
                      target="_blank"
                      title={word.sourceVideo.title}
                    >
                      <PlayCircle
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                      <span className="max-w-64 truncate">
                        From: {word.sourceVideo.title}
                      </span>
                    </a>
                  ) : null}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 md:flex">
                <ActionButton
                  className="min-h-9 min-w-0 px-3 text-xs [&>span:last-child]:whitespace-nowrap"
                  disabled={word.item.status === 'learning'}
                  icon={<BookOpen className="size-4" />}
                  onClick={() => updateWordStatus(word, 'shouldLearn')}
                >
                  Should Learn
                </ActionButton>
                <ActionButton
                  className="min-h-9 min-w-0 px-3 text-xs [&>span:last-child]:whitespace-nowrap"
                  disabled={word.item.status === 'alreadyKnow'}
                  icon={<Check className="size-4" />}
                  onClick={() => updateWordStatus(word, 'alreadyKnow')}
                  tone="paper"
                >
                  Already Know
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ContentPanel
          eyebrow="Empty"
          title="No words here yet"
        >
          <p className="text-ink-soft text-sm leading-6 font-normal">
            Pick words from Explore or Dictionary and they will appear here.
          </p>
        </ContentPanel>
      )}
    </div>
  )
}
