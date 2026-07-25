'use client'

import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/input'
import { MangaButton } from '@/components/ui/MangaButton'
import { computeHints } from '@/modules/dictation/correction'
import {
  filterHintsToSentence,
  isWordInSentence,
} from '@/modules/dictation/correction/hintWords'
import type { DictationSegmentApiRecord } from '@/modules/dictation/types'
import {
  resetDictationSegmentHintsApi,
  setDictationSegmentHintsApi,
} from '@/requests/dictationHintsApi'

interface Props {
  onSegmentChange: (segment: DictationSegmentApiRecord) => void
  segments: DictationSegmentApiRecord[]
}

/** Sentences shown per page - keeps the edit page short instead of one long
 * scroll through every segment. */
const PAGE_SIZE = 5

/** Effective hints shown for a segment: the saved override when set, otherwise
 * the automatic hints the practice input would compute for this sentence. */
function effectiveHints(segment: DictationSegmentApiRecord): string[] {
  return segment.hintsOverridden
    ? segment.hints
    : computeHints(segment.text, '')
}

export function DictationHintEditor({ onSegmentChange, segments }: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ index: number; segmentId: string } | null>(
    null
  )
  const [page, setPage] = useState(0)

  const pageCount = Math.max(1, Math.ceil(segments.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageStart = safePage * PAGE_SIZE
  const visibleSegments = segments.slice(pageStart, pageStart + PAGE_SIZE)

  function setError(segmentId: string, message: string | null) {
    setErrors(current => {
      const next = { ...current }

      if (message) next[segmentId] = message
      else delete next[segmentId]

      return next
    })
  }

  async function saveHints(
    segment: DictationSegmentApiRecord,
    hints: string[]
  ) {
    setSavingId(segment.id)
    setError(segment.id, null)

    try {
      const response = await setDictationSegmentHintsApi({
        hints,
        segmentId: segment.id,
      })

      onSegmentChange(response.segment)
      setDrafts(current => ({ ...current, [segment.id]: '' }))
    } catch (error) {
      setError(
        segment.id,
        error instanceof Error ? error.message : 'Could not save hints.'
      )
    } finally {
      setSavingId(null)
    }
  }

  async function resetHints(segment: DictationSegmentApiRecord) {
    setSavingId(segment.id)
    setError(segment.id, null)

    try {
      const response = await resetDictationSegmentHintsApi(segment.id)

      onSegmentChange(response.segment)
    } catch (error) {
      setError(
        segment.id,
        error instanceof Error ? error.message : 'Could not reset hints.'
      )
    } finally {
      setSavingId(null)
    }
  }

  function handleAddHint(segment: DictationSegmentApiRecord) {
    const word = (drafts[segment.id] ?? '').trim()

    if (word.length === 0) return

    if (!isWordInSentence(segment.text, word)) {
      setError(segment.id, 'That word is not in this sentence.')
      return
    }

    void saveHints(
      segment,
      filterHintsToSentence(segment.text, [...effectiveHints(segment), word])
    )
  }

  function handleRemoveHint(segment: DictationSegmentApiRecord, hint: string) {
    void saveHints(
      segment,
      effectiveHints(segment).filter(existing => existing !== hint)
    )
  }

  function handleReorder(
    segment: DictationSegmentApiRecord,
    fromIndex: number,
    toIndex: number
  ) {
    if (fromIndex === toIndex) return

    const list = [...effectiveHints(segment)]
    const [moved] = list.splice(fromIndex, 1)

    list.splice(toIndex, 0, moved)
    void saveHints(segment, list)
  }

  const pager =
    pageCount > 1 ? (
      <div className="flex items-center justify-between gap-2">
        <MangaButton
          type="button"
          tone="paper"
          disabled={safePage === 0}
          onClick={() => setPage(current => Math.max(0, current - 1))}
          icon={
            <ChevronLeft
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          Prev
        </MangaButton>
        <span className="text-manga-ink-soft text-center text-xs font-black">
          Sentences {pageStart + 1}-{pageStart + visibleSegments.length} of{' '}
          {segments.length}
        </span>
        <MangaButton
          type="button"
          tone="paper"
          disabled={safePage >= pageCount - 1}
          onClick={() =>
            setPage(current => Math.min(pageCount - 1, current + 1))
          }
          icon={
            <ChevronRight
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          Next
        </MangaButton>
      </div>
    ) : null

  return (
    <MangaPanel
      eyebrow="Hints"
      title="Practice hints"
      className="lg:col-span-2"
    >
      <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
        Each sentence starts with the automatically detected hints. Add or
        remove words to override a sentence, or reset it back to automatic.
      </p>

      {segments.length === 0 ? (
        <p className="text-manga-ink-soft text-sm font-semibold">
          Add a transcript first - hints are edited per sentence.
        </p>
      ) : (
        <>
          {pager}
          <ol className="grid gap-3">
            {visibleSegments.map(segment => {
              const isSaving = savingId === segment.id
              const error = errors[segment.id]
              const hints = effectiveHints(segment)

              return (
                <li
                  key={segment.id}
                  className="border-manga-black bg-manga-white grid gap-2 border-2 p-3 shadow-[3px_3px_0_var(--manga-black)]"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="text-manga-ink-soft font-sans text-xs font-black tabular-nums">
                        {segment.order + 1}
                      </span>
                      <p className="min-w-0 text-sm leading-6 font-semibold break-words">
                        {segment.text}
                      </p>
                    </div>
                    <span className="text-manga-ink-soft shrink-0 font-sans text-xs font-black uppercase">
                      {segment.hintsOverridden ? 'Custom' : 'Auto'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {hints.length === 0 ? (
                      <span className="text-manga-ink-soft text-xs font-semibold">
                        No hints
                      </span>
                    ) : (
                      hints.map((hint, index) => (
                        <span
                          key={`${hint}-${index}`}
                          draggable={!isSaving}
                          onDragStart={() =>
                            setDrag({ index, segmentId: segment.id })
                          }
                          onDragOver={event => event.preventDefault()}
                          onDrop={event => {
                            event.preventDefault()

                            if (drag && drag.segmentId === segment.id)
                              handleReorder(segment, drag.index, index)

                            setDrag(null)
                          }}
                          onDragEnd={() => setDrag(null)}
                          className="border-manga-black bg-manga-paper-soft inline-flex cursor-move items-center gap-1 border-2 px-2 py-1 text-xs font-black shadow-[2px_2px_0_var(--manga-black)]"
                        >
                          <GripVertical
                            aria-hidden="true"
                            className="text-manga-ink-soft size-3"
                          />
                          {hint}
                          <IconButton
                            label={`Remove hint ${hint}`}
                            disabled={isSaving}
                            draggable={false}
                            onClick={() => handleRemoveHint(segment, hint)}
                            className="size-5 border-2 shadow-none"
                          >
                            <X
                              aria-hidden="true"
                              className="size-3"
                            />
                          </IconButton>
                        </span>
                      ))
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      aria-label={`Add a hint to sentence ${segment.order + 1}`}
                      value={drafts[segment.id] ?? ''}
                      disabled={isSaving}
                      onChange={event =>
                        setDrafts(current => ({
                          ...current,
                          [segment.id]: event.target.value,
                        }))
                      }
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleAddHint(segment)
                        }
                      }}
                      placeholder="Add a word from this sentence"
                      className="border-manga-black bg-manga-white h-10 max-w-xs rounded-none border-2 font-semibold shadow-[2px_2px_0_var(--manga-black)]"
                    />
                    <MangaButton
                      type="button"
                      tone="paper"
                      disabled={isSaving}
                      onClick={() => handleAddHint(segment)}
                      icon={
                        <Plus
                          aria-hidden="true"
                          className="size-5"
                        />
                      }
                    >
                      Add
                    </MangaButton>
                    {segment.hintsOverridden ? (
                      <MangaButton
                        type="button"
                        tone="paper"
                        disabled={isSaving}
                        onClick={() => resetHints(segment)}
                        icon={
                          <RotateCcw
                            aria-hidden="true"
                            className="size-5"
                          />
                        }
                      >
                        Reset to auto
                      </MangaButton>
                    ) : null}
                  </div>

                  {error ? (
                    <p
                      role="status"
                      className="text-manga-red text-xs font-black"
                    >
                      {error}
                    </p>
                  ) : null}
                </li>
              )
            })}
          </ol>
          {pager}
        </>
      )}
    </MangaPanel>
  )
}
