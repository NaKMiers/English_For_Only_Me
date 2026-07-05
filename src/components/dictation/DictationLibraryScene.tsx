'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import { Textarea } from '@/components/ui/textarea'
import {
  DICTATION_DEFAULT_IMPORT,
  DICTATION_QUALITY_GATE,
  DICTATION_RECENT_VIDEOS,
} from '@/constants/dictation'
import { cn } from '@/lib/utils'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'

interface Props {
  videos?: DictationVideoApiRecord[]
}

function getVideoMeta(video: DictationVideoApiRecord) {
  const transcript =
    video.transcriptStatus === 'manualAdded'
      ? 'transcript added'
      : 'needs transcript'
  const sentences =
    video.sentenceCount > 0 ? `${video.sentenceCount} sentences` : transcript

  return `${sentences} - ${video.status}`
}

function VideoSketch() {
  return (
    <div
      aria-label="Sketch preview of an imported YouTube video"
      className="border-manga-black bg-manga-pale-red relative min-h-64 overflow-hidden border-3 shadow-[inset_0_0_0_9px_rgba(255,255,255,0.38),4px_4px_0_var(--manga-black)]"
    >
      <svg
        role="img"
        aria-label="Hand drawn YouTube import preview"
        viewBox="0 0 720 420"
        className="text-manga-black h-full min-h-64 w-full"
      >
        <rect
          x="54"
          y="48"
          width="612"
          height="286"
          fill="#ffffff"
          stroke="currentColor"
          strokeWidth="8"
        />
        <path
          d="M104 278 C188 176 250 232 330 146 C438 32 532 154 630 92"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
        />
        <path
          d="M318 152 L318 260 L426 206 Z"
          fill="#e03020"
          stroke="currentColor"
          strokeWidth="8"
        />
        <rect
          x="82"
          y="358"
          width="560"
          height="22"
          fill="#ffffff"
          stroke="currentColor"
          strokeWidth="5"
        />
        <rect
          x="82"
          y="358"
          width="274"
          height="22"
          fill="#e03020"
          stroke="currentColor"
          strokeWidth="5"
        />
      </svg>
    </div>
  )
}

export function DictationLibraryScene({ videos = [] }: Props) {
  const [youtubeUrl, setYoutubeUrl] = useState(
    DICTATION_DEFAULT_IMPORT.youtubeUrl
  )
  const [transcriptSource, setTranscriptSource] = useState(
    DICTATION_DEFAULT_IMPORT.transcript
  )

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
      <MangaPanel
        eyebrow="Page 01"
        title="Choose a video. Turn it into practice."
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          Paste a YouTube URL, add a trusted English transcript, then split it
          into sentence panels for dictation.
        </p>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
          <VideoSketch />

          <form className="grid content-start gap-4">
            <div className="grid gap-2">
              <Label
                htmlFor="dictation-youtube-url"
                className="font-sans text-xs font-black tracking-normal uppercase"
              >
                YouTube URL
              </Label>
              <Input
                id="dictation-youtube-url"
                value={youtubeUrl}
                onChange={event => setYoutubeUrl(event.target.value)}
                className="border-manga-black bg-manga-white min-h-12 rounded-none border-3 font-semibold shadow-[3px_3px_0_var(--manga-black)]"
              />
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor="dictation-transcript-source"
                className="font-sans text-xs font-black tracking-normal uppercase"
              >
                Transcript source
              </Label>
              <Textarea
                id="dictation-transcript-source"
                value={transcriptSource}
                onChange={event => setTranscriptSource(event.target.value)}
                className="border-manga-black bg-manga-white min-h-36 rounded-none border-3 text-base leading-6 font-semibold shadow-[3px_3px_0_var(--manga-black)]"
              />
            </div>

            <MangaButton
              href="/dictation/import"
              icon={
                <Plus
                  aria-hidden="true"
                  className="size-5"
                />
              }
            >
              Build Dictation
            </MangaButton>
          </form>
        </div>

        <section
          aria-label="Recent dictation videos"
          className="grid gap-3 md:grid-cols-3"
        >
          {(videos.length > 0
            ? videos.slice(0, 3).map(video => ({
                href: `/dictation/videos/${video.id}/results`,
                id: video.id,
                meta: getVideoMeta(video),
                status: video.status,
                title: video.title,
              }))
            : DICTATION_RECENT_VIDEOS.map(video => ({
                ...video,
                href: undefined,
              }))
          ).map(video => (
            <article
              key={video.id}
              className="border-manga-black bg-manga-white grid min-w-0 gap-2 border-2 p-3 shadow-[3px_3px_0_var(--manga-black)]"
            >
              <strong className="font-sans text-base leading-tight font-black break-words">
                {video.title}
              </strong>
              <span className="text-manga-ink-soft text-sm leading-5 font-semibold">
                {video.meta}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'border-manga-black bg-manga-paper-soft text-manga-black w-fit rounded-none border-2 font-black'
                )}
              >
                {video.status}
              </Badge>
              {video.href ? (
                <MangaButton
                  href={video.href}
                  tone="paper"
                  className="min-h-10 px-3 py-1 text-xs"
                >
                  Open Results
                </MangaButton>
              ) : null}
            </article>
          ))}
        </section>
      </MangaPanel>

      <aside className="grid content-start gap-5">
        <MangaPanel
          eyebrow="Gate"
          title="Import gate"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            Bad transcripts poison practice. This page makes quality obvious
            before the session starts.
          </p>
          <div className="grid gap-3">
            {DICTATION_QUALITY_GATE.map(item => (
              <QueueRow
                key={item.id}
                title={item.title}
                meta={item.meta}
                status={item.status}
              />
            ))}
          </div>
        </MangaPanel>

        <MangaPanel
          eyebrow="Next"
          title="Transcript quality"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            If timestamps exist, practice can replay each sentence. If not, the
            module still works in untimed manual mode.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Human captions', 'Manual paste', 'VTT/SRT later'].map(label => (
              <Badge
                key={label}
                className="border-manga-black bg-manga-white text-manga-black rounded-none border-2 font-black shadow-[2px_2px_0_var(--manga-black)]"
              >
                {label}
              </Badge>
            ))}
          </div>
        </MangaPanel>
      </aside>
    </div>
  )
}
