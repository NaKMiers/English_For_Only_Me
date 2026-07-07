'use client'

import {
  Captions,
  CheckCircle2,
  LinkIcon,
  Save,
  ScrollText,
  Upload,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import { Textarea } from '@/components/ui/textarea'
import type { TranscriptPayloadSourceType } from '@/modules/dictation/schemas/transcriptPayloadSchema'
import {
  getDictationStatusLabel,
  getDictationStatusTone,
} from '@/modules/dictation/statusDisplay'
import type {
  DictationTranscriptApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'
import { importYouTubeVideoApi } from '@/requests/dictationImportsApi'
import { buildDictationSegmentsApi } from '@/requests/dictationSegmentsApi'
import { attachDictationTranscriptApi } from '@/requests/dictationTranscriptsApi'

import { DictationVideoThumbnail } from './DictationVideoThumbnail'

type FormStage = 'idle' | 'savingVideo' | 'videoSaved' | 'savingTranscript'

interface Props {
  initialVideo?: DictationVideoApiRecord | null
  mode?: 'import' | 'edit'
}

const defaultTranscriptText =
  'Paste the English transcript here. Manual text is accepted now. Pasted VTT or SRT captions are detected when timing lines are present.'
const CAPTION_FILE_MAX_BYTES = 500_000
const CAPTION_FILE_EXTENSIONS = ['.vtt', '.srt', '.txt']

function isSupportedCaptionFile(file: File) {
  const lowerName = file.name.toLowerCase()

  return CAPTION_FILE_EXTENSIONS.some(extension =>
    lowerName.endsWith(extension)
  )
}

function StatusMessage({
  message,
  tone = 'paper',
}: {
  message: string
  tone?: 'paper' | 'red'
}) {
  return (
    <div
      role="status"
      className={
        tone === 'red'
          ? 'border-manga-black bg-manga-paper-soft border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-black)]'
          : 'border-manga-black bg-manga-white border-2 p-3 text-sm leading-6 font-semibold shadow-[3px_3px_0_var(--manga-black)]'
      }
    >
      {message}
    </div>
  )
}

export function DictationImportForm({
  initialVideo = null,
  mode = 'import',
}: Props) {
  const captionFileInputRef = useRef<HTMLInputElement | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState(initialVideo?.youtubeUrl ?? '')
  const [transcriptText, setTranscriptText] = useState(defaultTranscriptText)
  const [transcriptSourceType, setTranscriptSourceType] =
    useState<TranscriptPayloadSourceType>('manualText')
  const [captionFileName, setCaptionFileName] = useState<string | null>(null)
  const [video, setVideo] = useState<DictationVideoApiRecord | null>(
    initialVideo
  )
  const [transcript, setTranscript] =
    useState<DictationTranscriptApiRecord | null>(null)
  const [stage, setStage] = useState<FormStage>(
    initialVideo ? 'videoSaved' : 'idle'
  )
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canAttachTranscript = Boolean(video) && stage !== 'savingTranscript'
  const isEditMode = mode === 'edit'
  const videoStatus = video?.status ?? 'draft'
  const transcriptStatus = transcript?.qualityStatus ?? 'waiting'

  async function handleCaptionFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    setErrorMessage(null)
    setMessage(null)

    if (!isSupportedCaptionFile(file)) {
      event.target.value = ''
      setCaptionFileName(null)
      setErrorMessage('Upload a .vtt, .srt, or .txt caption file.')
      return
    }

    if (file.size > CAPTION_FILE_MAX_BYTES) {
      event.target.value = ''
      setCaptionFileName(null)
      setErrorMessage('Caption file is too large for this import step.')
      return
    }

    try {
      const text = await file.text()

      if (!text.trim()) {
        event.target.value = ''
        setCaptionFileName(null)
        setErrorMessage('Caption file does not contain readable text.')
        return
      }

      setTranscriptText(text)
      setTranscriptSourceType('captionFile')
      setCaptionFileName(file.name)
      setMessage(`${file.name} loaded. Save the video, then attach it.`)
    } catch {
      event.target.value = ''
      setCaptionFileName(null)
      setErrorMessage('Could not read this caption file.')
    }
  }

  async function handleVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStage('savingVideo')
    setErrorMessage(null)
    setMessage(null)
    setTranscript(null)

    try {
      const response = await importYouTubeVideoApi({ youtubeUrl })

      setVideo(response.video)
      setStage('videoSaved')
      setMessage(
        response.warning ??
          'Video saved. Add transcript text to prepare it for segmenting.'
      )
    } catch (error) {
      setStage('idle')
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save this video.'
      )
    }
  }

  async function handleTranscriptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!video) {
      setErrorMessage('Save a YouTube video before adding transcript text.')
      return
    }

    setStage('savingTranscript')
    setErrorMessage(null)
    setMessage(null)

    try {
      const response = await attachDictationTranscriptApi({
        videoId: video.id,
        language: 'en',
        sourceType: transcriptSourceType,
        rawText: transcriptText,
      })

      setTranscript(response.transcript)
      setVideo({
        ...video,
        activeTranscriptId: response.transcript.id,
        status: 'transcriptReady',
        transcriptStatus: 'manualAdded',
      })
      setStage('videoSaved')

      try {
        const segmentResponse = await buildDictationSegmentsApi(
          response.transcript.id
        )

        setVideo({
          ...video,
          activeTranscriptId: response.transcript.id,
          sentenceCount: segmentResponse.segments.length,
          status: 'ready',
          transcriptStatus: 'manualAdded',
        })
        setMessage(
          `Transcript saved and ${segmentResponse.segments.length} sentence segments are ready for practice.`
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? `Transcript saved, but segment building failed: ${error.message}`
            : 'Transcript saved, but segment building failed.'
        )
      }
    } catch (error) {
      setStage('videoSaved')
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save transcript.'
      )
    }
  }

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
      <MangaPanel
        eyebrow={isEditMode ? 'Video' : 'Import'}
        title={isEditMode ? 'Saved YouTube video' : 'Save a YouTube video'}
      >
        {isEditMode && video ? (
          <>
            <DictationVideoThumbnail
              title={video.title}
              thumbnailUrl={video.thumbnailUrl}
              youtubeVideoId={video.youtubeVideoId}
              priority
              sizes="(min-width: 1280px) 45vw, 100vw"
            />
            <QueueRow
              title={video.title}
              meta={video.channelTitle ?? 'URL-only draft'}
              status={getDictationStatusLabel(videoStatus)}
              statusTone={getDictationStatusTone(videoStatus)}
            />
          </>
        ) : (
          <>
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              The app stores metadata from the official YouTube API when
              available. If the key is missing, it saves a URL-only draft and
              waits for your transcript.
            </p>

            <form
              className="grid gap-4"
              onSubmit={handleVideoSubmit}
            >
              <div className="grid gap-2">
                <Label
                  htmlFor="youtube-import-url"
                  className="font-sans text-xs font-black tracking-normal uppercase"
                >
                  YouTube URL
                </Label>
                <Input
                  id="youtube-import-url"
                  value={youtubeUrl}
                  onChange={event => setYoutubeUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="border-manga-black bg-manga-white min-h-12 rounded-none border-3 font-semibold shadow-[3px_3px_0_var(--manga-black)]"
                />
              </div>

              <MangaButton
                type="submit"
                disabled={stage === 'savingVideo'}
                icon={
                  <Save
                    aria-hidden="true"
                    className="size-5"
                  />
                }
              >
                {stage === 'savingVideo' ? 'Saving Video' : 'Save Video'}
              </MangaButton>
            </form>
          </>
        )}

        {errorMessage ? (
          <StatusMessage
            tone="red"
            message={errorMessage}
          />
        ) : null}
        {message ? <StatusMessage message={message} /> : null}
        {video?.status === 'ready' ? (
          <MangaButton
            href={`/dictation/videos/${video.id}/practice`}
            tone="paper"
          >
            Open Practice
          </MangaButton>
        ) : null}
      </MangaPanel>

      <MangaPanel
        eyebrow="Transcript"
        title="Attach source text"
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          Upload a caption file, or paste manual transcript text you obtained
          yourself. The app does not scrape YouTube transcript endpoints.
        </p>

        <form
          className="grid gap-4"
          onSubmit={handleTranscriptSubmit}
        >
          <div className="grid gap-2">
            <Label
              htmlFor="dictation-caption-file"
              className="font-sans text-xs font-black tracking-normal uppercase"
            >
              Caption file
            </Label>
            <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
              <input
                ref={captionFileInputRef}
                id="dictation-caption-file"
                type="file"
                accept=".vtt,.srt,.txt,text/vtt,text/plain"
                className="sr-only"
                onChange={handleCaptionFileChange}
              />
              <MangaButton
                type="button"
                icon={
                  <Upload
                    aria-hidden="true"
                    className="size-5"
                  />
                }
                onClick={() => captionFileInputRef.current?.click()}
              >
                Choose File
              </MangaButton>
              <div className="border-manga-black bg-manga-paper-soft min-w-0 border-2 px-3 py-2 text-sm leading-6 font-black shadow-[2px_2px_0_var(--manga-black)]">
                {captionFileName ?? 'No caption file selected'}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="dictation-import-transcript"
              className="font-sans text-xs font-black tracking-normal uppercase"
            >
              English transcript or VTT/SRT text
            </Label>
            <Textarea
              id="dictation-import-transcript"
              value={transcriptText}
              onChange={event => {
                setTranscriptText(event.target.value)
                if (!captionFileName) setTranscriptSourceType('manualText')
              }}
              className="border-manga-black bg-manga-white field-sizing-fixed h-120 max-h-120 min-h-52 resize-y overflow-y-auto rounded-none border-3 text-base leading-6 font-semibold shadow-[3px_3px_0_var(--manga-black)]"
            />
          </div>

          <MangaButton
            type="submit"
            disabled={!canAttachTranscript}
            icon={
              <ScrollText
                aria-hidden="true"
                className="size-5"
              />
            }
          >
            {stage === 'savingTranscript'
              ? 'Saving Transcript'
              : 'Attach Transcript'}
          </MangaButton>
        </form>
      </MangaPanel>

      <aside className="grid content-start gap-5 xl:col-start-2 xl:row-start-1 xl:row-end-3">
        <MangaPanel
          eyebrow="Status"
          title="Import readiness"
        >
          <div className="grid gap-3">
            <QueueRow
              title={video ? video.title : 'No video saved yet'}
              meta={
                video
                  ? (video.channelTitle ?? 'URL-only draft')
                  : 'Paste a YouTube URL first'
              }
              status={getDictationStatusLabel(videoStatus)}
              statusTone={getDictationStatusTone(videoStatus)}
              action={
                video ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="text-manga-red size-5"
                  />
                ) : (
                  <LinkIcon
                    aria-hidden="true"
                    className="size-5"
                  />
                )
              }
            />
            <QueueRow
              title={
                transcript ? 'Transcript source saved' : 'Transcript needed'
              }
              meta={
                transcript
                  ? `${transcript.cueCount} timed cues - ${transcript.sourceHash.slice(0, 10)}`
                  : 'Manual text or pasted captions'
              }
              status={getDictationStatusLabel(transcriptStatus)}
              statusTone={getDictationStatusTone(transcriptStatus)}
              action={
                <Captions
                  aria-hidden="true"
                  className="size-5"
                />
              }
            />
          </div>
        </MangaPanel>

        <MangaPanel
          eyebrow="Policy"
          title="Caption boundary"
        >
          <div className="flex flex-wrap gap-2">
            {[
              'Official metadata',
              'Manual transcript',
              'Pasted VTT/SRT',
              'No scraping',
            ].map(label => (
              <Badge
                key={label}
                className="border-manga-black bg-manga-white text-manga-black rounded-none border-2 font-black shadow-[2px_2px_0_var(--manga-black)]"
              >
                {label}
              </Badge>
            ))}
          </div>
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            Public YouTube caption download is not available through the
            official API for arbitrary videos, so transcript text stays
            user-provided in this version.
          </p>
          <PageTag tone="pale">Segment builder next</PageTag>
        </MangaPanel>
      </aside>
    </div>
  )
}
