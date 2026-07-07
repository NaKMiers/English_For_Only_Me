import type { Metadata } from 'next'
import { Pencil } from 'lucide-react'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { DictationDeleteVideoButton } from '@/components/dictation/DictationDeleteVideoButton'
import { DictationVideoThumbnail } from '@/components/dictation/DictationVideoThumbnail'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import {
  getDictationStatusLabel,
  getDictationStatusTone,
} from '@/modules/dictation/statusDisplay'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export const metadata: Metadata = {
  title: 'Saved Dictation Videos',
  description: 'Saved Dictation Lab videos and next practice actions.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function formatVideoMeta(video: DictationVideoApiRecord) {
  const segmentText =
    video.sentenceCount > 0 ? `${video.sentenceCount} segments` : 'No segments'
  const transcriptText =
    video.transcriptStatus === 'manualAdded'
      ? 'transcript added'
      : 'needs transcript'

  return `${segmentText} - ${transcriptText} - ${getDictationStatusLabel(video.status)}`
}

function VideoLibrary({
  isMongoConfigured,
  videos,
}: {
  isMongoConfigured: boolean
  videos: DictationVideoApiRecord[]
}) {
  const emptyMessage = isMongoConfigured
    ? 'No saved videos yet. Import a YouTube source and transcript to start the library.'
    : 'Set MONGODB_URI on the server before saved videos can appear here.'

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab saved video shelf"
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <MangaPanel
          eyebrow="Library"
          title="Saved dictation videos"
          action={
            <MangaButton href="/dictation/import">Import Video</MangaButton>
          }
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            This is the listening module shelf inside English For Only Me:
            import, continue practice, or open results without making Dictation
            feel like the whole app.
          </p>
        </MangaPanel>

        {videos.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {videos.map(video => {
              const hasTranscript = hasDictationTranscript(video)

              return (
                <MangaPanel
                  key={video.id}
                  eyebrow={getDictationStatusLabel(video.status)}
                  title={video.title}
                  action={<PageTag tone="red">Video</PageTag>}
                >
                  <DictationVideoThumbnail
                    title={video.title}
                    thumbnailUrl={video.thumbnailUrl}
                    youtubeVideoId={video.youtubeVideoId}
                    sizes="(min-width: 1024px) 44vw, 100vw"
                  />
                  <QueueRow
                    title="Current state"
                    meta={formatVideoMeta(video)}
                    status={getDictationStatusLabel(video.importStatus)}
                    statusTone={getDictationStatusTone(video.importStatus)}
                  />
                  {video.importWarning ? (
                    <p className="border-manga-black bg-manga-paper-soft border-2 p-3 text-sm leading-6 font-black shadow-[3px_3px_0_var(--manga-black)]">
                      {video.importWarning}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-3">
                      {hasTranscript ? (
                        <>
                          <MangaButton
                            href={`/dictation/videos/${video.id}/practice`}
                          >
                            Practice
                          </MangaButton>
                          <MangaButton
                            href={`/dictation/videos/${video.id}/results`}
                            tone="paper"
                          >
                            Results
                          </MangaButton>
                        </>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <MangaButton
                        href={`/dictation/videos/${video.id}/edit`}
                        tone="paper"
                        icon={
                          <Pencil
                            aria-hidden="true"
                            className="size-5"
                          />
                        }
                      >
                        Edit
                      </MangaButton>
                      <DictationDeleteVideoButton
                        title={video.title}
                        videoId={video.id}
                      />
                    </div>
                  </div>
                </MangaPanel>
              )
            })}
          </div>
        ) : (
          <MangaPanel
            eyebrow="Empty"
            title="No video shelf yet"
          >
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              {emptyMessage}
            </p>
            <div className="flex flex-wrap gap-3">
              <MangaButton href="/dictation/import">Import Video</MangaButton>
              <MangaButton
                href="/dictation"
                tone="paper"
              >
                Back To Lab
              </MangaButton>
            </div>
          </MangaPanel>
        )}
      </section>
    </MangaPageShell>
  )
}

export default async function Page() {
  if (!hasMongoDbUri())
    return (
      <VideoLibrary
        isMongoConfigured={false}
        videos={[]}
      />
    )

  const ownerId = await getCurrentOwnerId()

  await connectDatabase()

  const videos = await DictationVideoModel.find({
    ownerId,
    status: {
      $ne: 'archived',
    },
  })
    .sort({ createdAt: -1 })
    .limit(60)
    .lean()

  return (
    <VideoLibrary
      isMongoConfigured
      videos={videos.map(toDictationVideoRecord)}
    />
  )
}
