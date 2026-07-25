'use client'

import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import { Textarea } from '@/components/ui/textarea'
import type { CaptionCue } from '@/modules/dictation/translations/captionOverlap'
import { getLanguageLabel } from '@/modules/dictation/translations/languages'
import { resolveSegmentTranslation } from '@/modules/dictation/translations/segmentTranslation'
import type { DictationSegmentApiRecord } from '@/modules/dictation/types'
import {
  setDictationSegmentTranslationApi,
  translateDictationSegmentApi,
} from '@/requests/dictationTranslationsApi'

interface TranslationTrack {
  cues: CaptionCue[]
  language: string
}

interface Props {
  onSegmentChange: (segment: DictationSegmentApiRecord) => void
  segments: DictationSegmentApiRecord[]
  translationTracks: TranslationTrack[]
}

const PAGE_SIZE = 5

export function DictationTranslationEditor({
  onSegmentChange,
  segments,
  translationTracks,
}: Props) {
  const languages = translationTracks.map(track => track.language)
  const [language, setLanguage] = useState(languages[0] ?? '')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  const cues =
    translationTracks.find(track => track.language === language)?.cues ?? []
  const pageCount = Math.max(1, Math.ceil(segments.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageStart = safePage * PAGE_SIZE
  const visibleSegments = segments.slice(pageStart, pageStart + PAGE_SIZE)

  function draftKey(segmentId: string) {
    return `${segmentId}:${language}`
  }

  // Current value shown: the local edit if any, otherwise the saved override or
  // the time-overlapped caption from the uploaded SRT/VTT.
  function currentValue(segment: DictationSegmentApiRecord) {
    const key = draftKey(segment.id)

    if (key in drafts) return drafts[key]

    return resolveSegmentTranslation({ cues, language, segment })
  }

  function setError(segmentId: string, message: string | null) {
    setErrors(current => {
      const next = { ...current }

      if (message) next[segmentId] = message
      else delete next[segmentId]

      return next
    })
  }

  function setDraft(segmentId: string, value: string) {
    setDrafts(current => ({ ...current, [draftKey(segmentId)]: value }))
  }

  async function saveTranslation(
    segment: DictationSegmentApiRecord,
    text: string
  ) {
    setBusyId(segment.id)
    setError(segment.id, null)

    try {
      const response = await setDictationSegmentTranslationApi({
        language,
        segmentId: segment.id,
        text,
      })

      onSegmentChange(response.segment)
      // Drop the local draft so the field re-derives from the saved segment.
      setDrafts(current => {
        const next = { ...current }

        delete next[draftKey(segment.id)]

        return next
      })
    } catch (error) {
      setError(
        segment.id,
        error instanceof Error ? error.message : 'Could not save translation.'
      )
    } finally {
      setBusyId(null)
    }
  }

  async function aiTranslate(segment: DictationSegmentApiRecord) {
    setBusyId(segment.id)
    setError(segment.id, null)

    try {
      const response = await translateDictationSegmentApi({
        language,
        segmentId: segment.id,
      })

      setDraft(segment.id, response.translation)
    } catch (error) {
      setError(
        segment.id,
        error instanceof Error ? error.message : 'Could not translate.'
      )
    } finally {
      setBusyId(null)
    }
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
      eyebrow="Translations"
      title="Edit translations"
    >
      {languages.length === 0 ? (
        <p className="text-manga-ink-soft text-sm font-semibold">
          Add a non-primary caption track first, then edit its translation per
          sentence here.
        </p>
      ) : (
        <>
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
            Each sentence loads its translation from the uploaded captions. Edit
            it by hand, or use AI to translate, then save. Changes show in
            practice.
          </p>

          {languages.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              {languages.map(code => (
                <MangaButton
                  key={code}
                  type="button"
                  tone={code === language ? 'primary' : 'paper'}
                  onClick={() => {
                    setLanguage(code)
                    setPage(0)
                  }}
                >
                  {getLanguageLabel(code)}
                </MangaButton>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xs font-black tracking-normal uppercase">
              {getLanguageLabel(language)}
            </p>
          )}

          {pager}

          <ol className="grid gap-3">
            {visibleSegments.map(segment => {
              const isBusy = busyId === segment.id
              const error = errors[segment.id]
              const value = currentValue(segment)
              const savedOverride = segment.translations?.[language] ?? ''
              const isOverridden = savedOverride.trim().length > 0
              const isDirty =
                value !== resolveSegmentTranslation({ cues, language, segment })

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
                      {isOverridden ? 'Custom' : 'From captions'}
                    </span>
                  </div>

                  <Textarea
                    aria-label={`Translation for sentence ${segment.order + 1}`}
                    value={value}
                    disabled={isBusy}
                    onChange={event => setDraft(segment.id, event.target.value)}
                    rows={2}
                    className="border-manga-black bg-manga-white rounded-none border-2 font-semibold shadow-[2px_2px_0_var(--manga-black)]"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <MangaButton
                      type="button"
                      disabled={isBusy || !isDirty}
                      onClick={() => saveTranslation(segment, value)}
                      icon={
                        <Save
                          aria-hidden="true"
                          className="size-5"
                        />
                      }
                    >
                      Save
                    </MangaButton>
                    <MangaButton
                      type="button"
                      tone="paper"
                      disabled={isBusy}
                      onClick={() => aiTranslate(segment)}
                      icon={
                        <Sparkles
                          aria-hidden="true"
                          className="size-5"
                        />
                      }
                    >
                      {isBusy ? 'Working' : 'AI translate'}
                    </MangaButton>
                    {isOverridden ? (
                      <MangaButton
                        type="button"
                        tone="paper"
                        disabled={isBusy}
                        onClick={() => saveTranslation(segment, '')}
                        icon={
                          <RotateCcw
                            aria-hidden="true"
                            className="size-5"
                          />
                        }
                      >
                        Reset to captions
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
