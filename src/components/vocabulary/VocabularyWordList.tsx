'use client'

import { BookOpen, CalendarClock, Check, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

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
import { setVocabItemStatusApi } from '@/requests/vocabularyApi'

import { VocabTermHeader } from './VocabTermHeader'

interface Props {
  activeView: VocabWordListView
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
const DEFAULT_PER_PAGE = 50

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

function clampPage(value: number, pageCount: number) {
  return Math.min(Math.max(value, 1), Math.max(pageCount, 1))
}

function wordMatchesView(word: VocabWordListRecord, view: VocabWordListView) {
  if (view === 'dueToday')
    return (
      word.item.status === 'learning' &&
      Boolean(word.item.dueAt && new Date(word.item.dueAt) <= new Date())
    )

  if (view === 'knownTotal')
    return word.item.status === 'alreadyKnow' || word.item.status === 'mastered'

  return word.item.status === view
}

export function VocabularyWordList({ activeView, words }: Props) {
  const [wordItems, setWordItems] = useState(words)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PER_PAGE)
  const [customPageSize, setCustomPageSize] = useState(String(DEFAULT_PER_PAGE))
  const [busyWordId, setBusyWordId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pageCount = Math.max(1, Math.ceil(wordItems.length / pageSize))
  const safePage = clampPage(currentPage, pageCount)
  const visibleWords = useMemo(() => {
    const start = (safePage - 1) * pageSize

    return wordItems.slice(start, start + pageSize)
  }, [pageSize, safePage, wordItems])
  const firstItem = wordItems.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const lastItem = Math.min(wordItems.length, safePage * pageSize)

  function updatePageSize(value: number) {
    const nextPageSize = Math.max(1, Math.floor(value))

    setPageSize(nextPageSize)
    setCustomPageSize(String(nextPageSize))
    setCurrentPage(1)
  }

  async function updateWordStatus(
    word: VocabWordListRecord,
    status: 'shouldLearn' | 'alreadyKnow'
  ) {
    setBusyWordId(word.item.id)
    setError(null)
    setMessage(null)

    try {
      const response = await setVocabItemStatusApi({
        source: 'manual',
        status,
        vocabEntryId: word.entry.id,
      })
      const nextWord = {
        ...word,
        item: response.item,
      }

      setWordItems(current =>
        current.flatMap(item => {
          if (item.item.id !== word.item.id) return [item]

          return wordMatchesView(nextWord, activeView) ? [nextWord] : []
        })
      )
      setMessage(
        status === 'shouldLearn'
          ? `"${word.entry.term}" moved to Learning.`
          : `"${word.entry.term}" marked as Already Know.`
      )
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : 'Could not update this word.'
      )
    } finally {
      setBusyWordId(null)
    }
  }

  const hasPresetPageSize = PER_PAGE_OPTIONS.some(option => option === pageSize)

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
          {wordItems.length} words in this view.
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
              'border-manga-black relative px-3 py-2 text-sm font-black shadow-[3px_3px_0_var(--manga-black)] transition-[background,color,box-shadow,transform] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
              VIEW_TAB_CLASS_NAMES[tab.view],
              tab.view === activeView &&
                'translate-x-[3px] translate-y-[3px] shadow-none after:bg-manga-black after:absolute after:-bottom-2 after:left-2 after:right-2 after:h-1'
            )}
            href={tab.href}
            aria-current={tab.view === activeView ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="border-manga-black bg-manga-white grid gap-3 border-3 p-3 shadow-[3px_3px_0_var(--manga-black)] md:grid-cols-[1fr_auto] md:items-end">
        <div className="grid gap-2 sm:grid-cols-[minmax(160px,220px)_minmax(120px,160px)]">
          <div className="grid gap-1">
            <span className="text-xs font-black uppercase">Per page</span>
            <Select
              value={String(pageSize)}
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
                  <SelectItem value={String(pageSize)}>{pageSize}</SelectItem>
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
              className="border-manga-black bg-manga-white h-11 rounded-none border-3 px-3 font-sans font-black shadow-[3px_3px_0_var(--manga-black)]"
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
            disabled={safePage === 1}
            onClick={() =>
              setCurrentPage(page => clampPage(page - 1, pageCount))
            }
            tone="paper"
          >
            Prev
          </MangaButton>
          <span className="text-sm font-black uppercase">
            {firstItem}-{lastItem} / {wordItems.length}
          </span>
          <MangaButton
            disabled={safePage >= pageCount}
            onClick={() =>
              setCurrentPage(page => clampPage(page + 1, pageCount))
            }
            tone="paper"
          >
            Next
          </MangaButton>
        </div>
      </div>

      {message ? (
        <div className="border-manga-black bg-manga-white border-3 p-3 text-sm font-black shadow-[3px_3px_0_var(--manga-black)]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="border-manga-black bg-manga-pale-red border-3 p-3 text-sm font-black">
          {error}
        </div>
      ) : null}

      {wordItems.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleWords.map(word => (
            <article
              key={word.item.id}
              className="border-manga-black bg-manga-white grid min-w-0 gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]"
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
                <span className="border-manga-black bg-manga-paper-soft grid size-8 place-items-center border-2">
                  {getStatusIcon(word)}
                </span>
                <span>{word.item.source}</span>
                <span>{word.entry.enrichmentStatus}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <MangaButton
                  className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                  disabled={
                    busyWordId === word.item.id ||
                    word.item.status === 'learning'
                  }
                  icon={<BookOpen className="size-4" />}
                  onClick={() => updateWordStatus(word, 'shouldLearn')}
                >
                  Should Learn
                </MangaButton>
                <MangaButton
                  className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                  disabled={
                    busyWordId === word.item.id ||
                    word.item.status === 'alreadyKnow'
                  }
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
