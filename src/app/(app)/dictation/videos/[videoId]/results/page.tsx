import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { DictationDebriefPanel } from '@/components/dictation/DictationDebriefPanel'
import { DictationResultsSummary } from '@/components/dictation/DictationResultsSummary'
import { DictationReviewQueue } from '@/components/dictation/DictationReviewQueue'
import { DictationStatsPanel } from '@/components/dictation/DictationStatsPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { listDueReviewItemsForOwner } from '@/modules/dictation/review/reviewItemService'
import { toDictationDebriefRecord } from '@/modules/dictation/services/dictationDebriefRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import { getVideoStatsForOwner } from '@/modules/dictation/stats/videoStatsService'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export const metadata: Metadata = {
  title: 'Dictation Results',
  description: 'Review one video result and the weak sentences to drill next.',
}

export const runtime = 'nodejs'

interface Props {
  params: Promise<{
    videoId: string
  }>
}

function ResultsSetupState({
  message,
  title,
  videoId,
}: {
  message: string
  title: string
  videoId?: string | null
}) {
  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab listening module"
        />
      }
    >
      <section className="p-4 sm:p-6 lg:p-8">
        <MangaPanel
          eyebrow="Results"
          title={title}
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            {message}
          </p>
          <div className="flex flex-wrap gap-3">
            <MangaButton href="/dictation">Back To Dictation Lab</MangaButton>
            {videoId ? (
              <MangaButton href={`/dictation/videos/${videoId}/edit`}>
                Add Transcript
              </MangaButton>
            ) : null}
            <MangaButton
              href="/dictation/import"
              tone="paper"
            >
              Import Video
            </MangaButton>
          </div>
        </MangaPanel>
      </section>
    </MangaPageShell>
  )
}

export default async function Page({ params }: Props) {
  const { videoId } = await params

  if (!/^[a-f\d]{24}$/i.test(videoId)) notFound()

  if (!hasMongoDbUri())
    return (
      <ResultsSetupState
        title="MongoDB is not configured"
        message="Set MONGODB_URI on the server before opening saved results."
      />
    )

  const ownerId = await getCurrentOwnerId()

  await connectDatabase()

  const video = await DictationVideoModel.findOne({
    _id: videoId,
    ownerId,
    status: {
      $ne: 'archived',
    },
  }).lean()

  if (!video) notFound()

  const videoRecord = toDictationVideoRecord(video)

  if (!hasDictationTranscript(videoRecord))
    return (
      <ResultsSetupState
        title="Transcript is needed"
        message="Attach an English transcript before opening results for this video."
        videoId={videoId}
      />
    )

  const [stats, reviewItems, latestDebrief] = await Promise.all([
    getVideoStatsForOwner({
      ownerId,
      videoId,
    }),
    listDueReviewItemsForOwner({
      ownerId,
      videoId,
    }),
    DictationDebriefModel.findOne({
      ownerId,
      status: 'ready',
      videoId,
    })
      .sort({ createdAt: -1 })
      .lean(),
  ])
  const isEmpty = stats.segmentCount === 0 || stats.completedSegmentCount === 0

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab listening module"
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <DictationResultsSummary
          isEmpty={isEmpty}
          thumbnailUrl={video.thumbnailUrl}
          title={video.title}
          videoId={videoId}
          videoStatus={videoRecord.status}
          youtubeVideoId={video.youtubeVideoId}
        />

        {isEmpty ? (
          <MangaPanel
            eyebrow="Empty"
            title="Practice first"
          >
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              The review queue stays quiet until there is a real weak sentence
              to drill.
            </p>
          </MangaPanel>
        ) : (
          <>
            <DictationStatsPanel stats={stats} />
            <DictationDebriefPanel
              canGenerate={video.status === 'completed'}
              initialDebrief={
                latestDebrief ? toDictationDebriefRecord(latestDebrief) : null
              }
              videoId={videoId}
            />
            <DictationReviewQueue
              reviewItems={reviewItems}
              title="Weak segments from this video"
            />
          </>
        )}
      </section>
    </MangaPageShell>
  )
}
