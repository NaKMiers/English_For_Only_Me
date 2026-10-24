'use client'

import {
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

import { MangaPanel } from '@/components/common/MangaPanel'
import { Input } from '@/components/ui/input'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
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

const VIEW_TAB_CLASS_NAMES: Record<VocabWordListView, string> = {
  alreadyKnow: 'bg-emerald-100 hover:bg-emerald-200',
  dueToday: 'bg-cyan-100 hover:bg-cyan-200',
  knownTotal: 'bg-yellow-100 hover:bg-yellow-200',
  learning: 'bg-manga-paper-soft hover:bg-manga-pale-red',
  mastered: 'bg-violet-100 hover:bg-violet-200',
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
  if (word.item.status === 'learning') return <BookOpen className="size-4" />
  if (word.item.status === 'mastered') return <Trophy className="size-4" />
  if (word.item.status === 'alreadyKnow') return <Check className="size-4" />

  return <CalendarClock className="size-4" />
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
    <div className="grid gap-5">
      <MangaPanel
        eyebrow="Vocabulary"
        title={VIEW_LABELS[activeView]}
        action={
          <MangaButton
            href="/vocabulary"
            tone="paper"
          >
            Back To Vocab
          </MangaButton>
        }
      >
        <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
          {visibleTotal} words in this view.
        </p>
      </MangaPanel>

      <nav
        aria-label="Vocabulary word views"
        className="flex flex-wrap gap-2"
      >
        {VIEW_TABS.map(tab => (
          <Link
            key={tab.view}
            className={cn(
              'border-manga-black text-manga-black! rounded-control sticker-press relative px-3 py-2 text-sm font-black shadow-[3px_3px_0_var(--manga-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
              VIEW_TAB_CLASS_NAMES[tab.view],
              tab.view === activeView &&
                'after:bg-manga-black translate-x-[3px] translate-y-[3px] shadow-none after:absolute after:right-2 after:-bottom-2 after:left-2 after:h-1'
            )}
            href={tab.href}
            aria-current={tab.view === activeView ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="border-manga-black bg-manga-white rounded-panel grid gap-3 border-3 p-3 shadow-[3px_3px_0_var(--manga-black)] md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2 sm:grid-cols-[minmax(160px,220px)_minmax(120px,160px)]">
          <div className="grid gap-1">
            <span className="text-xs font-black uppercase">Per page</span>
            <Select
              value={String(perPage)}
              onValueChange={value => {
                if (!value) return
                updatePageSize(Number(value))
              }}
            >
              <SelectTrigger
                aria-label="Words per page"
                className="w-full"
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
          <div className="grid gap-1">
            <span className="text-xs font-black uppercase">Custom</span>
            <Input
              aria-label="Custom words per page"
              className="border-manga-black bg-manga-white rounded-control h-11 border-3 px-3 font-sans font-black shadow-[3px_3px_0_var(--manga-black)]"
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

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <MangaButton
            disabled={page <= 1}
            onClick={() => goTo(page - 1)}
            tone="paper"
          >
            Prev
          </MangaButton>
          <span className="text-sm font-black uppercase">
            {firstItem}-{lastItem} / {visibleTotal}
          </span>
          <MangaButton
            disabled={page >= pageCount}
            onClick={() => goTo(page + 1)}
            tone="paper"
          >
            Next
          </MangaButton>
        </div>
      </div>

      {message ? (
        <div className="border-manga-black bg-manga-white rounded-control border-3 p-3 text-sm font-black shadow-[3px_3px_0_var(--manga-black)]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="border-manga-black bg-manga-pale-red rounded-control border-3 p-3 text-sm font-black">
          {error}
        </div>
      ) : null}

      {wordItems.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {wordItems.map(word => (
            <article
              key={word.item.id}
              className="border-manga-black bg-manga-white rounded-panel grid min-w-0 gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid min-w-0 flex-1 gap-1">
                  <VocabTermHeader entry={word.entry} />
                  <p className="text-manga-ink-soft text-xs font-black uppercase">
                    {getStatusMeta(word)}
                  </p>
                </div>
                <PageTag tone="pale">
                  {word.entry.frequencyRank
                    ? `#${word.entry.frequencyRank}`
                    : word.entry.enrichmentStatus}
                </PageTag>
              </div>

              <div className="grid gap-1">
                <p className="line-clamp-2 text-right text-sm leading-6 font-black">
                  {getVietnamesePreview(word)}
                </p>
                <p className="text-manga-ink-soft line-clamp-3 text-sm leading-6 font-semibold">
                  {getDefinitionPreview(word)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase">
                <span className="border-manga-black bg-manga-paper-soft rounded-tag grid size-8 place-items-center border-2">
                  {getStatusIcon(word)}
                </span>
                <span>{word.item.source}</span>
                <span>{word.entry.enrichmentStatus}</span>
              </div>

              {word.sourceVideo ? (
                <a
                  className="border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red text-manga-black rounded-control sticker-press flex min-w-0 items-center gap-2 border-2 px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_var(--manga-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  href={`/dictation/videos/${word.sourceVideo.id}/practice`}
                  rel="noopener noreferrer"
                  target="_blank"
                  title={word.sourceVideo.title}
                >
                  <PlayCircle className="size-4 shrink-0" />
                  <span className="truncate">
                    From: {word.sourceVideo.title}
                  </span>
                </a>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <MangaButton
                  className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                  disabled={word.item.status === 'learning'}
                  icon={<BookOpen className="size-4" />}
                  onClick={() => updateWordStatus(word, 'shouldLearn')}
                >
                  Should Learn
                </MangaButton>
                <MangaButton
                  className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                  disabled={word.item.status === 'alreadyKnow'}
                  icon={<Check className="size-4" />}
                  onClick={() => updateWordStatus(word, 'alreadyKnow')}
                  tone="paper"
                >
                  Already Know
                </MangaButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <MangaPanel
          eyebrow="Empty"
          title="No words here yet"
        >
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
            Pick words from Explore or Dictionary and they will appear here.
          </p>
        </MangaPanel>
      )}
    </div>
  )
}
