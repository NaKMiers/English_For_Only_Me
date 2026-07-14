'use client'

import { CheckCircle2, LinkIcon, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { AdminVideoTranscriptPreview } from '@/components/dictation/AdminVideoTranscriptPreview'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import {
  getDictationStatusLabel,
  getDictationStatusTone,
} from '@/modules/dictation/statusDisplay'
import type { CaptionCue } from '@/modules/dictation/translations/captionOverlap'
import {
  DEFAULT_DICTATION_LANGUAGE,
  normalizeTranslationLanguage,
} from '@/modules/dictation/translations/languages'
import type {
  DictationSegmentApiRecord,
  DictationTranscriptApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'
import { importYouTubeVideoApi } from '@/requests/dictationImportsApi'
import { getDictationVideoDetailApi } from '@/requests/dictationVideosApi'

import { DictationCaptionManager } from './DictationCaptionManager'
import { DictationVideoThumbnail } from './DictationVideoThumbnail'

type FormStage = 'idle' | 'savingVideo' | 'videoSaved'

interface Props {
  initialActiveTranscriptId?: string | null
  initialSegments?: DictationSegmentApiRecord[]
  initialTracks?: DictationTranscriptApiRecord[]
  initialTranslationTracks?: TranslationTrack[]
  initialVideo?: DictationVideoApiRecord | null
  mode?: 'import' | 'edit'
}

interface TranslationTrack {
  cues: CaptionCue[]
  language: string
}

function getPreviewTranslationTracks({
  primaryLanguage,
  tracks,
}: {
  primaryLanguage: string
  tracks: DictationTranscriptApiRecord[]
}): TranslationTrack[] {
  const normalizedPrimaryLanguage =
    normalizeTranslationLanguage(primaryLanguage)

  return tracks
    .filter(
      track =>
        normalizeTranslationLanguage(track.language) !==
          normalizedPrimaryLanguage && track.cueCount > 0
    )
    .map(track => ({
      language: track.language,
      cues: track.rawCues.map(cue => ({
        endMs: cue.endMs,
        startMs: cue.startMs,
        text: cue.text,
      })),
    }))
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

function SavedVideoPreview({
  segments,
  translationTracks,
  video,
}: {
  segments: DictationSegmentApiRecord[]
  translationTracks: TranslationTrack[]
  video: DictationVideoApiRecord
}) {
  const videoStatus = video.status

  return (
    <>
      {segments.length > 0 ? (
        <AdminVideoTranscriptPreview
          segments={segments}
          title={video.title}
          translationTracks={translationTracks}
          youtubeVideoId={video.youtubeVideoId}
        />
      ) : video.youtubeVideoId ? (
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
  initialSegments = [],
  initialTracks = [],
  initialTranslationTracks = [],
  initialVideo = null,
  mode = 'import',
}: Props) {
  const router = useRouter()
  const [youtubeUrl, setYoutubeUrl] = useState(initialVideo?.youtubeUrl ?? '')
  const [video, setVideo] = useState<DictationVideoApiRecord | null>(
    initialVideo
  )
  const [activeTranscriptId, setActiveTranscriptId] = useState<string | null>(
    initialActiveTranscriptId
  )
  const [segments, setSegments] =
    useState<DictationSegmentApiRecord[]>(initialSegments)
  const [tracks, setTracks] =
    useState<DictationTranscriptApiRecord[]>(initialTracks)
  const [translationTracks, setTranslationTracks] = useState<
    TranslationTrack[]
  >(initialTranslationTracks)
  const [stage, setStage] = useState<FormStage>(
    initialVideo ? 'videoSaved' : 'idle'
  )
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isEditMode = mode === 'edit'

  async function refreshVideoPreview(nextVideo = video) {
    if (!nextVideo) return

    try {
      const response = await getDictationVideoDetailApi(nextVideo.id)

      setVideo(response.video)
      setActiveTranscriptId(response.video.activeTranscriptId)
      setSegments(response.segments)
      setTracks(response.tracks)
      setTranslationTracks(
        getPreviewTranslationTracks({
          primaryLanguage: response.video.defaultLanguage,
          tracks: response.tracks,
        })
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Captions were saved, but the preview could not refresh.'
      )
    }
  }

  async function handleVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStage('savingVideo')
    setErrorMessage(null)
    setMessage(null)

    try {
      const response = await importYouTubeVideoApi({ youtubeUrl })

      if (response.alreadyExists) {
        router.push(`/admin/videos/${response.video.id}/edit`)
        return
      }

      setVideo(response.video)
      setActiveTranscriptId(response.video.activeTranscriptId)
      setSegments([])
      setTracks([])
      setTranslationTracks([])
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
          <SavedVideoPreview
            segments={segments}
            translationTracks={translationTracks}
            video={video}
          />
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
          initialActiveTranscriptId={activeTranscriptId}
          initialTracks={tracks}
          onTracksChanged={() => {
            void refreshVideoPreview()
          }}
          videoId={video.id}
        />
      ) : null}
    </div>
  )
}
