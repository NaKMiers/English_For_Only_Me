'use client'

import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Save,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { ActionButton } from '@/components/ui/ActionButton'
import { Textarea } from '@/components/ui/textarea'
import { INTL_LOCALES } from '@/i18n/config'
import { format } from '@/i18n/format'
import { useLocale, useMessages } from '@/i18n/client'
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
  const t = useMessages()
  const tr = t.admin.translations
  const intlLocale = INTL_LOCALES[useLocale()]
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
        error instanceof Error ? error.message : tr.saveFailed
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
        error instanceof Error ? error.message : tr.translateFailed
      )
    } finally {
      setBusyId(null)
    }
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
      eyebrow={tr.eyebrow}
      title={tr.title}
    >
      {languages.length === 0 ? (
        <p className="text-ink-soft text-sm font-normal">{tr.needTrack}</p>
      ) : (
        <>
          <p className="text-ink-soft text-sm leading-6 font-normal">
            {tr.intro}
          </p>

          {languages.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              {languages.map(code => (
                <ActionButton
                  key={code}
                  type="button"
                  tone={code === language ? 'primary' : 'paper'}
                  onClick={() => {
                    setLanguage(code)
                    setPage(0)
                  }}
                >
                  {getLanguageLabel(code, intlLocale)}
                </ActionButton>
              ))}
            </div>
          ) : (
            <p className="font-sans text-xs font-semibold tracking-normal">
              {getLanguageLabel(language, intlLocale)}
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
                      {isOverridden ? tr.custom : tr.fromCaptions}
                    </span>
                  </div>

                  <Textarea
                    aria-label={format(tr.fieldLabel, {
                      number: segment.order + 1,
                    })}
                    value={value}
                    disabled={isBusy}
                    onChange={event => setDraft(segment.id, event.target.value)}
                    rows={2}
                    className="border-line bg-surface rounded-control border font-semibold"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButton
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
                      {t.common.actions.save}
                    </ActionButton>
                    <ActionButton
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
                      {isBusy ? tr.working : tr.aiTranslate}
                    </ActionButton>
                    {isOverridden ? (
                      <ActionButton
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
                        {tr.reset}
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
