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

import { ContentPanel } from '@/components/common/ContentPanel'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/input'
import { ActionButton } from '@/components/ui/ActionButton'
import { format } from '@/i18n/format'
import { useMessages } from '@/i18n/client'
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
  const t = useMessages()
  const h = t.admin.hints
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
        error instanceof Error ? error.message : h.saveFailed
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
        error instanceof Error ? error.message : h.resetFailed
      )
    } finally {
      setSavingId(null)
    }
  }

  function handleAddHint(segment: DictationSegmentApiRecord) {
    const word = (drafts[segment.id] ?? '').trim()

    if (word.length === 0) return

    if (!isWordInSentence(segment.text, word)) {
      setError(segment.id, h.notInSentence)
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
        <ActionButton
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
          {t.admin.pager.prev}
        </ActionButton>
        <span className="text-ink-soft text-center text-xs font-normal">
          {format(t.admin.pager.range, {
            from: pageStart + 1,
            to: pageStart + visibleSegments.length,
            total: segments.length,
          })}
        </span>
        <ActionButton
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
          {t.common.actions.next}
        </ActionButton>
      </div>
    ) : null

  return (
    <ContentPanel
      eyebrow={h.eyebrow}
      title={h.title}
    >
      <p className="text-ink-soft text-sm leading-6 font-normal">{h.intro}</p>

      {segments.length === 0 ? (
        <p className="text-ink-soft text-sm font-normal">{h.needTranscript}</p>
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
                  className="border-line bg-surface rounded-control grid gap-2 border p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <span className="text-ink-soft font-sans text-xs font-normal tabular-nums">
                        {segment.order + 1}
                      </span>
                      <p className="min-w-0 text-sm leading-6 font-semibold break-words">
                        {segment.text}
                      </p>
                    </div>
                    <span className="text-ink-soft shrink-0 font-sans text-xs font-normal">
                      {segment.hintsOverridden ? h.custom : h.auto}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {hints.length === 0 ? (
                      <span className="text-ink-soft text-xs font-normal">
                        {h.none}
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
                          className="border-line bg-tint rounded-tag inline-flex cursor-move items-center gap-1 border px-2 py-1 text-xs font-semibold"
                        >
                          <GripVertical
                            aria-hidden="true"
                            className="text-ink-soft size-3"
                          />
                          {hint}
                          <IconButton
                            label={format(h.removeHint, { hint })}
                            disabled={isSaving}
                            draggable={false}
                            onClick={() => handleRemoveHint(segment, hint)}
                            className="rounded-tag size-5 border shadow-none"
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
                      aria-label={format(h.addLabel, {
                        number: segment.order + 1,
                      })}
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
                      placeholder={h.addPlaceholder}
                      className="border-line bg-surface rounded-control h-10 max-w-xs border font-semibold"
                    />
                    <ActionButton
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
                      {h.add}
                    </ActionButton>
                    {segment.hintsOverridden ? (
                      <ActionButton
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
                        {h.reset}
                      </ActionButton>
                    ) : null}
                  </div>

                  {error ? (
                    <p
                      role="status"
                      className="text-brand text-xs font-semibold"
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
    </ContentPanel>
  )
}
