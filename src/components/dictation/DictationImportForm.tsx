'use client'

import { CheckCircle2, LinkIcon, Save } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import {
  getDictationStatusLabel,
  getDictationStatusTone,
} from '@/modules/dictation/statusDisplay'
import { DEFAULT_DICTATION_LANGUAGE } from '@/modules/dictation/translations/languages'
import type {
  DictationTranscriptApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'
import { importYouTubeVideoApi } from '@/requests/dictationImportsApi'

import { DictationCaptionManager } from './DictationCaptionManager'
import { DictationVideoThumbnail } from './DictationVideoThumbnail'

type FormStage = 'idle' | 'savingVideo' | 'videoSaved'

interface Props {
  initialActiveTranscriptId?: string | null
  initialTracks?: DictationTranscriptApiRecord[]
  initialVideo?: DictationVideoApiRecord | null
  mode?: 'import' | 'edit'
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

function SavedVideoPreview({ video }: { video: DictationVideoApiRecord }) {
  const videoStatus = video.status

  return (
    <>
      {video.youtubeVideoId ? (
        <div className="border-manga-black bg-manga-paper-soft relative aspect-video w-full max-w-xl overflow-hidden border-2 shadow-[3px_3px_0_var(--manga-black)]">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeVideoId}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      ) : (
        <DictationVideoThumbnail
          title={video.title}
          thumbnailUrl={video.thumbnailUrl}
          youtubeVideoId={video.youtubeVideoId}
          priority
          sizes="(min-width: 1280px) 45vw, 100vw"
          className="max-w-xl"
        />
      )}
      <QueueRow
        title={video.title}
        meta={video.channelTitle ?? 'URL-only draft'}
        status={getDictationStatusLabel(videoStatus)}
        statusTone={getDictationStatusTone(videoStatus)}
        action={
          <CheckCircle2
            aria-hidden="true"
            className="text-manga-red size-5"
          />
        }
      />
    </>
  )
}

export function DictationImportForm({
  initialActiveTranscriptId = null,
  initialTracks = [],
  initialVideo = null,
  mode = 'import',
}: Props) {
  const [youtubeUrl, setYoutubeUrl] = useState(initialVideo?.youtubeUrl ?? '')
  const [video, setVideo] = useState<DictationVideoApiRecord | null>(
    initialVideo
  )
  const [stage, setStage] = useState<FormStage>(
    initialVideo ? 'videoSaved' : 'idle'
  )
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isEditMode = mode === 'edit'

  async function handleVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStage('savingVideo')
    setErrorMessage(null)
    setMessage(null)

    try {
      const response = await importYouTubeVideoApi({ youtubeUrl })

      setVideo(response.video)
      setStage('videoSaved')
      setMessage(
        response.warning ??
          'Video saved. Add captions per language below to prepare it for practice.'
      )
    } catch (error) {
      setStage('idle')
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not save this video.'
      )
    }
  }

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:items-start">
      <MangaPanel
        eyebrow={isEditMode || video ? 'Video' : 'Import'}
        title={video ? 'Saved YouTube video' : 'Save a YouTube video'}
        className={!video ? 'lg:col-span-2' : undefined}
      >
        {video ? (
          <SavedVideoPreview video={video} />
        ) : (
          <>
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              The app stores metadata from the official YouTube API when
              available. If the key is missing, it saves a URL-only draft and
              waits for your captions.
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
        {!video ? (
          <div className="text-manga-ink-soft flex items-center gap-2 text-sm font-semibold">
            <LinkIcon
              aria-hidden="true"
              className="size-5"
            />
            Save a YouTube URL first, then upload captions.
          </div>
        ) : null}
      </MangaPanel>

      {video ? (
        <DictationCaptionManager
          defaultLanguage={
            isEditMode ? video.defaultLanguage : DEFAULT_DICTATION_LANGUAGE
          }
          initialActiveTranscriptId={initialActiveTranscriptId}
          initialTracks={initialTracks}
          videoId={video.id}
        />
      ) : null}
    </div>
  )
}
