'use client'

import { Captions, CheckCircle2, Plus, Trash2, Upload } from 'lucide-react'
import { useCallback, useMemo, useRef, useState, type ChangeEvent } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatCuesAsCaptionText } from '@/modules/dictation/transcripts/formatCuesAsCaptionText'
import {
  getCuratedLanguageOptions,
  getLanguageLabel,
  isValidTranslationLanguage,
  normalizeTranslationLanguage,
} from '@/modules/dictation/translations/languages'
import type { DictationTranscriptApiRecord } from '@/modules/dictation/types'
import { buildDictationSegmentsApi } from '@/requests/dictationSegmentsApi'
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
  videoId,
}: Props) {
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
      setErrorMessage('Upload a .vtt, .srt, or .txt caption file.')
      return
    }

    if (file.size > CAPTION_FILE_MAX_BYTES) {
      event.target.value = ''
      setFileName(null)
      setCaptionText('')
      setErrorMessage('Caption file is too large.')
      return
    }

    try {
      const text = await file.text()

      if (!text.trim()) {
        event.target.value = ''
        setFileName(null)
        setCaptionText('')
        setErrorMessage('Caption file does not contain readable text.')
        return
      }

      setCaptionText(text)
      setFileName(file.name)
    } catch {
      event.target.value = ''
      setFileName(null)
      setCaptionText('')
      setErrorMessage('Could not read this caption file.')
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
        `Loaded existing ${getLanguageLabel(normalized)} captions - edit and save to update them.`
      )
    } else setCaptionText('')
  }

  async function attachPrimary(code: string) {
    const response = await attachDictationTranscriptApi({
      videoId,
      language: code,
      rawText: captionText,
    })
    const segmentResponse = await buildDictationSegmentsApi(
      response.transcript.id
    )
    const readyTranscript: DictationTranscriptApiRecord = {
      ...response.transcript,
      segmentCount: segmentResponse.segments.length,
    }

    setTracks(current => [
      readyTranscript,
      ...current.filter(
        track => normalizeTranslationLanguage(track.language) !== code
      ),
    ])
    setActiveId(readyTranscript.id)
    setMessage(
      `${getLanguageLabel(code)} captions saved - ${segmentResponse.segments.length} sentences ready for practice.`
    )
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
        ? `${getLanguageLabel(code)} captions saved (${response.transcript.cueCount} timed cues).`
        : `${getLanguageLabel(code)} saved, but no timings were detected - practice can only align timed (SRT/VTT) captions.`
    )
  }

  async function handleAttach() {
    const code = normalizeTranslationLanguage(languageCode)

    setErrorMessage(null)
    setMessage(null)

    if (!isValidTranslationLanguage(code)) {
      setErrorMessage('Choose or enter a valid language code first.')
      return
    }

    if (!captionText.trim()) {
      setErrorMessage('Upload a caption file or paste caption text first.')
      return
    }

    setIsSaving(true)

    try {
      if (code === primaryLanguage) await attachPrimary(code)
      else await attachTranslation(code)

      resetUpload()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not save these captions.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove(track: DictationTranscriptApiRecord) {
    setErrorMessage(null)
    setMessage(null)

    try {
      await deleteDictationTranscriptApi(track.id)
      setTracks(current => current.filter(item => item.id !== track.id))
      setMessage(`Removed ${getLanguageLabel(track.language)} captions.`)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not remove this track.'
      )
    }
  }

  return (
    <MangaPanel
      eyebrow="Captions"
      title="Language captions"
      className={className}
      action={
        <Badge
          className={
            isReady
              ? 'border-manga-black bg-manga-white text-manga-black rounded-none border-2 font-black'
              : 'border-manga-black bg-manga-pale-red text-manga-black rounded-none border-2 font-black'
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
          {isReady ? 'Ready' : 'Needs captions'}
        </Badge>
      }
    >
      <p className="text-manga-ink-soft text-base leading-7 font-semibold">
        Select a language and upload its subtitle file (SRT/VTT). Start with{' '}
        {getLanguageLabel(primaryLanguage)} - that becomes the dictation source
        and makes the video ready. Add more languages and their captions show as
        translations during practice.
      </p>

      {tracks.length > 0 ? (
        <div className="grid gap-3">
          {primaryTrack ? (
            <QueueRow
              title={getLanguageLabel(primaryTrack.language)}
              meta={
                primaryTrack.segmentCount > 0
                  ? `Dictation source - ${primaryTrack.segmentCount} sentences`
                  : 'Dictation source - building sentences'
              }
              status="source"
              onClick={() => selectLanguage(primaryTrack.language)}
              action={
                <CheckCircle2
                  aria-hidden="true"
                  className="text-manga-red size-5"
                />
              }
            />
          ) : null}
          {translationTracks.map(track => (
            <QueueRow
              key={track.id}
              title={getLanguageLabel(track.language)}
              meta={
                track.cueCount > 0
                  ? `${track.cueCount} timed cues`
                  : 'No timings detected'
              }
              status={track.language}
              onClick={() => selectLanguage(track.language)}
              action={
                <IconButton
                  label={`Remove ${getLanguageLabel(track.language)} captions`}
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
          ))}
        </div>
      ) : null}

      <div className="border-manga-black bg-manga-paper-soft grid gap-3 border-2 p-3 shadow-[3px_3px_0_var(--manga-black)]">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid gap-2">
            <span className="font-sans text-xs font-black tracking-normal uppercase">
              Language
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
                aria-label="Language"
                className="w-full border-3 shadow-[3px_3px_0_var(--manga-black)]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Choose a language&hellip;</SelectItem>
                {curatedOptions.map(option => (
                  <SelectItem
                    key={option.code}
                    value={option.code}
                  >
                    {option.label} ({option.code})
                    {option.code === primaryLanguage
                      ? ' - dictation source'
                      : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="caption-language-code"
              className="font-sans text-xs font-black tracking-normal uppercase"
            >
              Or language code
            </Label>
            <Input
              id="caption-language-code"
              value={languageCode}
              placeholder="e.g. en, ja, pt-br"
              onChange={event => setLanguageCode(event.target.value)}
              onBlur={event => {
                if (isValidTranslationLanguage(event.target.value))
                  selectLanguage(event.target.value)
              }}
              className="border-manga-black bg-manga-white min-h-11 rounded-none border-3 font-semibold shadow-[3px_3px_0_var(--manga-black)]"
            />
          </div>
        </div>

        {languageCode.trim() ? (
          <Badge className="border-manga-black bg-manga-white text-manga-black w-fit rounded-none border-2 font-black">
            {getLanguageLabel(languageCode)}
            {normalizeTranslationLanguage(languageCode) === primaryLanguage
              ? ' - dictation source'
              : ''}
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
          <MangaButton
            type="button"
            icon={
              <Upload
                aria-hidden="true"
                className="size-5"
              />
            }
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </MangaButton>
          <div className="border-manga-black bg-manga-white min-w-0 border-2 px-3 py-2 text-sm leading-6 font-black shadow-[2px_2px_0_var(--manga-black)]">
            {fileName ?? 'No caption file selected'}
          </div>
        </div>

        <div className="grid gap-2">
          <Label
            htmlFor="caption-text"
            className="font-sans text-xs font-black tracking-normal uppercase"
          >
            Or paste / type captions
          </Label>
          <Textarea
            id="caption-text"
            value={captionText}
            placeholder={
              'Paste SRT/VTT with timings, or type plain text.\n\n1\n00:00:01,000 --> 00:00:03,000\nYour caption line.'
            }
            onChange={event => {
              setCaptionText(event.target.value)
              setFileName(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="border-manga-black bg-manga-white max-h-96 min-h-40 overflow-y-auto rounded-none border-3 text-base leading-6 font-semibold shadow-[3px_3px_0_var(--manga-black)]"
          />
          <p className="text-manga-ink-soft text-xs leading-5 font-semibold">
            Timed (SRT/VTT) captions align to sentences during practice. Plain
            text works as a dictation source but a translation needs timings to
            line up.
          </p>
        </div>

        <MangaButton
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
          {isSaving
            ? 'Saving'
            : existingTrackForLanguage
              ? 'Save Captions'
              : 'Add Captions'}
        </MangaButton>
      </div>

      {errorMessage ? (
        <div
          role="status"
          className="border-manga-black bg-manga-pale-red border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-black)]"
        >
          {errorMessage}
        </div>
      ) : null}
      {message ? (
        <div
          role="status"
          className="border-manga-black bg-manga-white border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-black)]"
        >
          {message}
        </div>
      ) : null}

      {isReady ? (
        <MangaButton
          href={`/dictation/videos/${videoId}/practice`}
          tone="paper"
        >
          Open Practice
        </MangaButton>
      ) : null}
    </MangaPanel>
  )
}
