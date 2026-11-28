'use client'

import { CheckCircle2, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { AdminVideoTranscriptPreview } from '@/components/dictation/AdminVideoTranscriptPreview'
import { DictationHintEditor } from '@/components/dictation/DictationHintEditor'
import { DictationTranslationEditor } from '@/components/dictation/DictationTranslationEditor'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { getDictationStatusTone } from '@/modules/dictation/statusDisplay'
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
          ? 'border-line bg-tint rounded-control border p-3 text-sm leading-6 font-semibold'
          : 'border-line bg-surface rounded-control border p-3 text-sm leading-6 font-semibold'
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
  const t = useMessages()
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
        <div className="border-line bg-tint rounded-control relative aspect-video w-full max-w-xl overflow-hidden border">
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
        meta={video.channelTitle ?? t.admin.importForm.urlOnlyDraft}
        status={t.admin.status[videoStatus]}
        statusTone={getDictationStatusTone(videoStatus)}
        action={
          <CheckCircle2
            aria-hidden="true"
            className="text-brand size-5"
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
  const t = useMessages()
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

  function handleSegmentChange(updatedSegment: DictationSegmentApiRecord) {
    setSegments(current =>
      current.map(segment =>
        segment.id === updatedSegment.id ? updatedSegment : segment
      )
    )
  }

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
          : t.admin.importForm.previewRefreshFailed
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
        router.push(`/admin/dictation/videos/${response.video.id}/edit`)
        return
      }

      setVideo(response.video)
      setActiveTranscriptId(response.video.activeTranscriptId)
      setSegments([])
      setTracks([])
      setTranslationTracks([])
      setStage('videoSaved')
      setMessage(response.warning ?? t.admin.importForm.videoSaved)
    } catch (error) {
      setStage('idle')
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : t.admin.importForm.saveFailed
      )
    }
  }

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-2 lg:items-start">
      <ContentPanel
        eyebrow={
          isEditMode || video
            ? t.admin.importForm.eyebrowVideo
            : t.admin.importForm.eyebrowImport
        }
        title={
          video ? t.admin.importForm.savedTitle : t.admin.importForm.saveTitle
        }
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
            <p className="text-ink-soft text-base leading-7 font-normal">
              {t.admin.importForm.intro}
            </p>

            {/* The URL and its Save button share a row from sm. */}
            <form
              className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
              onSubmit={handleVideoSubmit}
            >
              <div className="grid gap-2">
                <Label
                  htmlFor="youtube-import-url"
                  className="font-sans text-xs font-semibold tracking-normal"
                >
                  {t.admin.importForm.urlLabel}
                </Label>
                <Input
                  id="youtube-import-url"
                  value={youtubeUrl}
                  onChange={event => setYoutubeUrl(event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="border-line bg-surface rounded-control min-h-12 border font-semibold"
                />
              </div>

              <ActionButton
                type="submit"
                disabled={stage === 'savingVideo'}
                icon={
                  <Save
                    aria-hidden="true"
                    className="size-5"
                  />
                }
              >
                {stage === 'savingVideo'
                  ? t.admin.importForm.savingVideo
                  : t.admin.importForm.saveVideo}
              </ActionButton>
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
      </ContentPanel>

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

      {video && segments.length > 0 ? (
        <DictationHintEditor
          onSegmentChange={handleSegmentChange}
          segments={segments}
        />
      ) : null}

      {video && segments.length > 0 && translationTracks.length > 0 ? (
        <DictationTranslationEditor
          onSegmentChange={handleSegmentChange}
          segments={segments}
          translationTracks={translationTracks}
        />
      ) : null}
    </div>
  )
}
