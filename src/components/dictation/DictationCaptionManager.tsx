'use client'

import { Captions, CheckCircle2, Plus, Trash2, Upload } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { InlineNotice } from '@/components/common/InlineNotice'
import { QueueRow } from '@/components/common/QueueRow'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionButton } from '@/components/ui/ActionButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { INTL_LOCALES } from '@/i18n/config'
import { format, plural } from '@/i18n/format'
import { useLocale, useMessages } from '@/i18n/client'
import { formatCuesAsCaptionText } from '@/modules/dictation/transcripts/formatCuesAsCaptionText'
import {
  getCuratedLanguageOptions,
  getLanguageLabel,
  isValidTranslationLanguage,
  normalizeTranslationLanguage,
} from '@/modules/dictation/translations/languages'
import type { DictationTranscriptApiRecord } from '@/modules/dictation/types'
import {
  attachDictationTranscriptApi,
  attachDictationTranslationTrackApi,
  deleteDictationTranscriptApi,
} from '@/requests/dictationTranscriptsApi'

const CAPTION_FILE_MAX_BYTES = 500_000
const CAPTION_FILE_EXTENSIONS = ['.vtt', '.srt', '.txt']

interface Props {
  className?: string
  defaultLanguage: string
  initialActiveTranscriptId: string | null
  initialTracks: DictationTranscriptApiRecord[]
  onDefaultLanguageChange?: (language: string) => void
  onTracksChanged?: () => void
  videoId: string
}

function isSupportedCaptionFile(file: File) {
  const lowerName = file.name.toLowerCase()

  return CAPTION_FILE_EXTENSIONS.some(extension =>
    lowerName.endsWith(extension)
  )
}

export function DictationCaptionManager({
  className,
  defaultLanguage,
  initialActiveTranscriptId,
  initialTracks,
  onTracksChanged,
  videoId,
}: Props) {
  const t = useMessages()
  const c = t.admin.captions
  const intlLocale = INTL_LOCALES[useLocale()]
  const languageLabel = (code: string) => getLanguageLabel(code, intlLocale)
  const primaryLanguage = normalizeTranslationLanguage(defaultLanguage)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [tracks, setTracks] =
    useState<DictationTranscriptApiRecord[]>(initialTracks)
  const [activeId, setActiveId] = useState<string | null>(
    initialActiveTranscriptId
  )
  const [languageCode, setLanguageCode] = useState(primaryLanguage)
  const [captionText, setCaptionText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // A failed remove shows on that track's row, not at the bottom.
  const [trackErrors, setTrackErrors] = useState<Record<string, string>>({})

  const primaryTrack = useMemo(
    () => tracks.find(track => track.id === activeId) ?? null,
    [tracks, activeId]
  )
  const translationTracks = useMemo(
    () =>
      tracks.filter(
        track =>
          track.id !== activeId &&
          normalizeTranslationLanguage(track.language) !== primaryLanguage
      ),
    [tracks, activeId, primaryLanguage]
  )
  const isReady = Boolean(primaryTrack && primaryTrack.segmentCount > 0)
  const curatedOptions = useMemo(() => {
    const used = new Set(
      translationTracks.map(track =>
        normalizeTranslationLanguage(track.language)
      )
    )

    return getCuratedLanguageOptions().filter(
      option => option.code === primaryLanguage || !used.has(option.code)
    )
  }, [translationTracks, primaryLanguage])

  const findTrackForLanguage = useCallback(
    (code: string) => {
      const normalized = normalizeTranslationLanguage(code)

      return normalized === primaryLanguage
        ? primaryTrack
        : (tracks.find(
            track => normalizeTranslationLanguage(track.language) === normalized
          ) ?? null)
    },
    [primaryLanguage, primaryTrack, tracks]
  )

  const existingTrackForLanguage = useMemo(
    () => findTrackForLanguage(languageCode),
    [languageCode, findTrackForLanguage]
  )

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    setErrorMessage(null)
    setMessage(null)

    if (!isSupportedCaptionFile(file)) {
      event.target.value = ''
      setFileName(null)
      setCaptionText('')
      setErrorMessage(c.fileType)
      return
    }

    if (file.size > CAPTION_FILE_MAX_BYTES) {
      event.target.value = ''
      setFileName(null)
      setCaptionText('')
      setErrorMessage(c.fileTooLarge)
      return
    }

    try {
      const text = await file.text()

      if (!text.trim()) {
        event.target.value = ''
        setFileName(null)
        setCaptionText('')
        setErrorMessage(c.fileEmpty)
        return
      }

      setCaptionText(text)
      setFileName(file.name)
    } catch {
      event.target.value = ''
      setFileName(null)
      setCaptionText('')
      setErrorMessage(c.fileUnreadable)
    }
  }

  function resetUpload() {
    setCaptionText('')
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function selectLanguage(code: string) {
    setLanguageCode(code)
    setErrorMessage(null)
    setMessage(null)

    const normalized = normalizeTranslationLanguage(code)
    const existingTrack = findTrackForLanguage(code)

    if (fileInputRef.current) fileInputRef.current.value = ''
    setFileName(null)

    if (existingTrack) {
      const looksFlattened =
        existingTrack.cueCount > 0 && !existingTrack.rawText.includes('-->')
      const captionSource = looksFlattened
        ? formatCuesAsCaptionText(existingTrack.rawCues)
        : existingTrack.rawText

      setCaptionText(captionSource)
      setMessage(
        format(c.loadedExisting, { language: languageLabel(normalized) })
      )
    } else setCaptionText('')
  }

  async function attachPrimary(code: string) {
    // Segments are built server-side when the transcript is saved, so the
    // response already carries the segment count - no separate build call.
    const response = await attachDictationTranscriptApi({
      videoId,
      language: code,
      rawText: captionText,
    })
    const readyTranscript = response.transcript

    setTracks(current => [
      readyTranscript,
      ...current.filter(
        track => normalizeTranslationLanguage(track.language) !== code
      ),
    ])
    setActiveId(readyTranscript.id)
    setMessage(
      plural(c.primarySaved, readyTranscript.segmentCount, {
        language: languageLabel(code),
      })
    )
    onTracksChanged?.()
  }

  async function attachTranslation(code: string) {
    const response = await attachDictationTranslationTrackApi({
      videoId,
      language: code,
      rawText: captionText,
    })

    setTracks(current => [
      ...current.filter(
        track =>
          track.id !== response.transcript.id &&
          normalizeTranslationLanguage(track.language) !== code
      ),
      response.transcript,
    ])
    setMessage(
      response.transcript.cueCount > 0
        ? plural(c.translationSaved, response.transcript.cueCount, {
            language: languageLabel(code),
          })
        : format(c.translationNoTimings, { language: languageLabel(code) })
    )
    onTracksChanged?.()
  }

  async function handleAttach() {
    const code = normalizeTranslationLanguage(languageCode)

    setErrorMessage(null)
    setMessage(null)

    if (!isValidTranslationLanguage(code)) {
      setErrorMessage(c.invalidLanguage)
      return
    }

    if (!captionText.trim()) {
      setErrorMessage(c.missingText)
      return
    }

    setIsSaving(true)

    try {
      if (code === primaryLanguage) await attachPrimary(code)
      else await attachTranslation(code)

      resetUpload()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : c.saveFailed)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove(track: DictationTranscriptApiRecord) {
    setErrorMessage(null)
    setMessage(null)
    setTrackErrors(({ [track.id]: _cleared, ...rest }) => rest)

    try {
      await deleteDictationTranscriptApi(track.id)
      setTracks(current => current.filter(item => item.id !== track.id))
      setMessage(format(c.removed, { language: languageLabel(track.language) }))
      onTracksChanged?.()
    } catch (error) {
      setTrackErrors(current => ({
        ...current,
        [track.id]: error instanceof Error ? error.message : c.removeFailed,
      }))
    }
  }

  return (
    <ContentPanel
      eyebrow={c.eyebrow}
      title={c.title}
      className={className}
      action={
        <Badge
          className={
            isReady
              ? 'border-line bg-surface text-ink rounded-tag border font-semibold'
              : 'border-line bg-tint-soft text-ink rounded-tag border font-semibold'
          }
        >
          {isReady ? (
            <CheckCircle2
              aria-hidden="true"
              className="mr-1 size-4"
            />
          ) : (
            <Captions
              aria-hidden="true"
              className="mr-1 size-4"
            />
          )}
          {isReady ? c.ready : c.needsCaptions}
        </Badge>
      }
    >
      <p className="text-ink-soft text-base leading-7 font-normal">
        {format(c.intro, { language: languageLabel(primaryLanguage) })}
      </p>

      {tracks.length > 0 ? (
        <div className="grid gap-3">
          {primaryTrack ? (
            <QueueRow
              title={languageLabel(primaryTrack.language)}
              meta={
                primaryTrack.segmentCount > 0
                  ? plural(c.sourceSentences, primaryTrack.segmentCount)
                  : c.sourceBuilding
              }
              status={c.sourceTag}
              onClick={() => selectLanguage(primaryTrack.language)}
              action={
                <CheckCircle2
                  aria-hidden="true"
                  className="text-brand size-5"
                />
              }
            />
          ) : null}
          {translationTracks.map(track => (
            <div
              className="grid gap-2"
              key={track.id}
            >
              <QueueRow
                title={languageLabel(track.language)}
                meta={
                  track.cueCount > 0
                    ? plural(c.timedCues, track.cueCount)
                    : c.noTimings
                }
                status={track.language}
                onClick={() => selectLanguage(track.language)}
                action={
                  <IconButton
                    label={format(c.removeTrack, {
                      language: languageLabel(track.language),
                    })}
                    onClick={event => {
                      event.stopPropagation()
                      handleRemove(track)
                    }}
                  >
                    <Trash2
                      aria-hidden="true"
                      className="size-5"
                    />
                  </IconButton>
                }
              />
              {trackErrors[track.id] ? (
                <InlineNotice tone="error">
                  {trackErrors[track.id]}
                </InlineNotice>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="border-line bg-tint rounded-control grid gap-3 border p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-2">
            <span className="font-sans text-xs font-semibold tracking-normal">
              {c.languageLabel}
            </span>
            <Select
              value={
                curatedOptions.some(option => option.code === languageCode)
                  ? languageCode
                  : ''
              }
              onValueChange={value => value && selectLanguage(value)}
            >
              <SelectTrigger
                aria-label={c.languageLabel}
                className="w-full border"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{c.chooseLanguage}</SelectItem>
                {curatedOptions.map(option => (
                  <SelectItem
                    key={option.code}
                    value={option.code}
                  >
                    {format(
                      option.code === primaryLanguage
                        ? c.languageOptionSource
                        : c.languageOption,
                      { label: languageLabel(option.code), code: option.code }
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="caption-language-code"
              className="font-sans text-xs font-semibold tracking-normal"
            >
              {c.codeLabel}
            </Label>
            <Input
              id="caption-language-code"
              value={languageCode}
              placeholder={c.codePlaceholder}
              onChange={event => setLanguageCode(event.target.value)}
              onBlur={event => {
                if (isValidTranslationLanguage(event.target.value))
                  selectLanguage(event.target.value)
              }}
              className="border-line bg-surface rounded-control min-h-11 border font-semibold"
            />
          </div>
        </div>

        {languageCode.trim() ? (
          <Badge className="border-line bg-surface text-ink rounded-tag w-fit border font-semibold">
            {normalizeTranslationLanguage(languageCode) === primaryLanguage
              ? format(c.languageSource, {
                  language: languageLabel(languageCode),
                })
              : languageLabel(languageCode)}
          </Badge>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
          <input
            ref={fileInputRef}
            id="caption-file"
            type="file"
            accept=".vtt,.srt,.txt,text/vtt,text/plain"
            className="sr-only"
            onChange={handleFileChange}
          />
          <ActionButton
            type="button"
            icon={
              <Upload
                aria-hidden="true"
                className="size-5"
              />
            }
            onClick={() => fileInputRef.current?.click()}
          >
            {c.chooseFile}
          </ActionButton>
          <div className="border-line bg-surface rounded-control min-w-0 border px-3 py-2 text-sm leading-6 font-semibold">
            {fileName ?? c.noFile}
          </div>
        </div>

        <div className="grid gap-2">
          <Label
            htmlFor="caption-text"
            className="font-sans text-xs font-semibold tracking-normal"
          >
            {c.pasteLabel}
          </Label>
          <Textarea
            id="caption-text"
            value={captionText}
            placeholder={c.pastePlaceholder}
            onChange={event => {
              setCaptionText(event.target.value)
              setFileName(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="border-line bg-surface rounded-control max-h-96 min-h-40 overflow-y-auto border text-base leading-6 font-semibold"
          />
          <p className="text-ink-soft text-xs leading-5 font-normal">
            {c.timingHint}
          </p>
        </div>

        <ActionButton
          type="button"
          disabled={isSaving}
          onClick={handleAttach}
          icon={
            <Plus
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          {isSaving ? c.saving : existingTrackForLanguage ? c.save : c.add}
        </ActionButton>
      </div>

      {/* Right under the Add / Save button that caused them. */}
      {errorMessage ? (
        <InlineNotice tone="error">{errorMessage}</InlineNotice>
      ) : null}
      {message ? <InlineNotice>{message}</InlineNotice> : null}

      {isReady ? (
        <ActionButton
          href={`/dictation/videos/${videoId}/practice`}
          tone="paper"
        >
          {c.openPractice}
        </ActionButton>
      ) : null}
    </ContentPanel>
  )
}
