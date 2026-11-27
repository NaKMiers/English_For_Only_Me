import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { ContentPanel } from '@/components/common/ContentPanel'
import { DictationDebriefPanel } from '@/components/dictation/DictationDebriefPanel'
import { DictationResultsSummary } from '@/components/dictation/DictationResultsSummary'
import { DictationReviewQueue } from '@/components/dictation/DictationReviewQueue'
import { DictationStatsPanel } from '@/components/dictation/DictationStatsPanel'
import { ActionButton } from '@/components/ui/ActionButton'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { getVideoProgressForUser } from '@/modules/dictation/content/progressRepository'
import { listDueReviewItemsForUser } from '@/modules/dictation/review/reviewItemService'
import { toDictationDebriefRecord } from '@/modules/dictation/services/dictationDebriefRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { getVideoStatsForUser } from '@/modules/dictation/stats/videoStatsService'
import type { DictationVideoProgress } from '@/modules/dictation/types'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.dictation.meta.resultsTitle,
    description: t.dictation.meta.resultsDescription,
  }
}

export const runtime = 'nodejs'

interface Props {
  params: Promise<{
    videoId: string
  }>
}

async function ResultsSetupState({
  message,
  title,
  videoId,
}: {
  message: string
  title: string
  videoId?: string | null
}) {
  const t = await getMessages()
  const text = t.dictation.setup

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle={t.dictation.meta.labSubtitle}
        />
      }
    >
      <section className="p-4 sm:p-6 lg:p-8">
        <ContentPanel
          eyebrow={t.dictation.results.eyebrow.notStarted}
          title={title}
        >
          <p className="text-ink-soft text-base leading-7 font-normal">
            {message}
          </p>
          <div className="flex flex-wrap gap-3">
            <ActionButton href="/dictation">{text.backToLab}</ActionButton>
            {videoId ? (
              <ActionButton href={`/admin/dictation/videos/${videoId}/edit`}>
                {text.addTranscript}
              </ActionButton>
            ) : null}
            <ActionButton
              href="/admin/dictation/import"
              tone="paper"
            >
              {text.importVideo}
            </ActionButton>
          </div>
        </ContentPanel>
      </section>
    </PageShell>
  )
}

export default async function Page({ params }: Props) {
  const { videoId } = await params

  if (!/^[a-f\d]{24}$/i.test(videoId)) notFound()

  const t = await getMessages()
  const text = t.dictation.results

  if (!hasMongoDbUri())
    return (
      <ResultsSetupState
        title={t.dictation.setup.noDatabaseTitle}
        message={t.dictation.setup.resultsNoDatabase}
      />
    )

  // Results are open to everyone. A null actor id (a visitor with no practice
  // history) owns no rows, so the reads below short-circuit to empty and the
  // page renders the "Practice first" state - never a query on an empty owner.
  const [actorId] = await Promise.all([getPracticeActorId(), connectDatabase()])

  // The reads below are keyed by the URL's video id and the learner, so they
  // start together with the video lookup instead of waiting for it.
  const [video, stats, reviewItems, latestDebrief, progress] =
    await Promise.all([
      DictationVideoModel.findOne({
        _id: videoId,
        status: {
          $ne: 'archived',
        },
      }).lean(),
      getVideoStatsForUser({
        userId: actorId,
        videoId,
      }),
      listDueReviewItemsForUser({
        userId: actorId,
        videoId,
      }),
      actorId
        ? DictationDebriefModel.findOne({
            userId: actorId,
            status: 'ready',
            videoId,
          })
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve(null),
      actorId
        ? getVideoProgressForUser({ userId: actorId, videoId })
        : Promise.resolve<DictationVideoProgress>('notStarted'),
    ])

  if (!video) notFound()

  const videoRecord = toDictationVideoRecord(video)

  if (!hasDictationTranscript(videoRecord))
    return (
      <ResultsSetupState
        title={t.dictation.setup.transcriptNeededTitle}
        message={t.dictation.setup.resultsTranscriptNeeded}
        videoId={videoId}
      />
    )

  const isEmpty = stats.segmentCount === 0 || stats.completedSegmentCount === 0

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle={t.dictation.meta.labSubtitle}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <DictationResultsSummary
          isEmpty={isEmpty}
          progress={progress}
          stats={stats}
          thumbnailUrl={video.thumbnailUrl}
          title={video.title}
          videoId={videoId}
          youtubeVideoId={video.youtubeVideoId}
        />

        {isEmpty ? (
          stats.segmentCount === 0 ? (
            <ContentPanel
              eyebrow={text.notReadyEyebrow}
              title={text.notReadyTitle}
            >
              <p className="text-ink-soft text-base leading-7 font-normal">
                {text.notReadyDescription}
              </p>
            </ContentPanel>
          ) : progress === 'completed' ? (
            <ContentPanel
              eyebrow={text.savingEyebrow}
              title={text.savingTitle}
            >
              <p className="text-ink-soft text-base leading-7 font-normal">
                {text.savingDescription}
              </p>
            </ContentPanel>
          ) : (
            <ContentPanel
              eyebrow={
                progress === 'inProgress'
                  ? text.keepGoingEyebrow
                  : text.emptyEyebrow
              }
              title={
                progress === 'inProgress'
                  ? text.inProgressTitle
                  : text.practiceFirstTitle
              }
            >
              <p className="text-ink-soft text-base leading-7 font-normal">
                {progress === 'inProgress'
                  ? text.inProgressDescription
                  : text.practiceFirstDescription}
              </p>
            </ContentPanel>
          )
        ) : (
          <>
            <DictationStatsPanel stats={stats} />
            <DictationDebriefPanel
              canGenerate={progress === 'completed'}
              initialDebrief={
                latestDebrief ? toDictationDebriefRecord(latestDebrief) : null
              }
              videoId={videoId}
            />
            <DictationReviewQueue
              reviewItems={reviewItems}
              title={text.weakSegments}
            />
          </>
        )}
      </section>
    </PageShell>
  )
}
