import { Headphones } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { ContentPanel } from '@/components/common/ContentPanel'
import { DictationDebriefPanel } from '@/components/dictation/DictationDebriefPanel'
import {
  DictationResultsSummary,
  type ResultsNextStop,
} from '@/components/dictation/DictationResultsSummary'
import { DictationStatsPanel } from '@/components/dictation/DictationStatsPanel'
import { EmptyState } from '@/components/journey/EmptyState'
import { topicStepLine } from '@/components/dictation/practice/topicStep'
import { hasMongoDbUri } from '@/constants/environments'
import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { pickNextStop } from '@/lib/journey/nextStop'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { getVideoProgressForUser } from '@/modules/dictation/content/progressRepository'
import { findNextVideo } from '@/modules/dictation/practice/findNextVideo'
import { loadVideoTopicRecord } from '@/modules/dictation/practice/topicRecord'
import { toDictationDebriefRecord } from '@/modules/dictation/services/dictationDebriefRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { requirePageUser } from '@/lib/auth/currentUser'
import { getVideoStatsForUser } from '@/modules/dictation/stats/videoStatsService'
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
}: {
  message: string
  title: string
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
      <section className="px-4 pb-6 md:pr-6 md:pl-0">
        {/* Learners only get the way back; transcripts are admin work. */}
        <EmptyState
          action={{ href: '/dictation', label: text.backToLab, tone: 'ink' }}
          body={message}
          icon={<Headphones />}
          title={title}
        />
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

  // A learner with no practice on this video owns no rows, so the reads below
  // come back empty and the page renders the "Practice first" state.
  const [user] = await Promise.all([requirePageUser(), connectDatabase()])

  // The reads below are keyed by the URL's video id and the learner, so they
  // start together with the video lookup instead of waiting for it.
  const [video, stats, latestDebrief, progress] = await Promise.all([
    DictationVideoModel.findOne({
      _id: videoId,
      status: {
        $ne: 'archived',
      },
    }).lean(),
    getVideoStatsForUser({
      userId: user.id,
      videoId,
    }),
    DictationDebriefModel.findOne({
      userId: user.id,
      status: 'ready',
      videoId,
    })
      .sort({ createdAt: -1 })
      .lean(),
    getVideoProgressForUser({ userId: user.id, videoId }),
  ])

  if (!video) notFound()

  const videoRecord = toDictationVideoRecord(video)

  if (!hasDictationTranscript(videoRecord))
    return (
      <ResultsSetupState
        title={t.dictation.setup.transcriptNeededTitle}
        message={t.dictation.setup.resultsTranscriptNeeded}
      />
    )

  const isEmpty = stats.segmentCount === 0 || stats.completedSegmentCount === 0
  const [nextVideo, topicRecord] = isEmpty
    ? [null, null]
    : await Promise.all([
        findNextVideo(videoRecord),
        loadVideoTopicRecord({ topicId: videoRecord.topicId, userId: user.id }),
      ])
  // The results already show the weak sentences, so the next stop is the
  // next video, not a separate spaced-review queue.
  const picked = pickNextStop<ResultsNextStop>([
    nextVideo
      ? {
          data: {
            actionLabel: text.nextVideoAction,
            detail: format(t.dictation.practice.nextInTopic, {
              topic: nextVideo.topicTitle,
            }),
            href: nextVideo.href,
            title: nextVideo.title,
          },
          kind: 'next',
        }
      : null,
  ])
  const breadcrumb = [
    { href: '/dictation', label: t.dictation.browse.allTopics },
    { label: video.title },
  ]

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          page={{
            breadcrumb,
            module: 'dictation',
            title: t.dictation.meta.resultsTitle,
          }}
          subtitle={t.dictation.meta.labSubtitle}
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          breadcrumb={{ items: breadcrumb, label: t.common.journey.breadcrumb }}
          icon={<Headphones />}
          iconClassName="bg-pastel-sky text-accent-blue"
          inTopbar
          title={t.dictation.meta.resultsTitle}
        />
        {isEmpty && (stats.segmentCount === 0 || progress === 'completed') ? (
          // A state of its own (no segments yet, final attempts still
          // saving): one panel, no "practice first" beside it.
          <ContentPanel
            eyebrow={
              stats.segmentCount === 0
                ? text.notReadyEyebrow
                : text.savingEyebrow
            }
            title={
              stats.segmentCount === 0 ? text.notReadyTitle : text.savingTitle
            }
          >
            <p className="text-ink-soft text-base leading-7 font-normal">
              {stats.segmentCount === 0
                ? text.notReadyDescription
                : text.savingDescription}
            </p>
          </ContentPanel>
        ) : (
          <DictationResultsSummary
            hasTopic={Boolean(video.topicId)}
            isEmpty={isEmpty}
            // Results look back: the record as it stands, never a "+1".
            journeyStep={
              topicRecord
                ? topicStepLine(
                    topicRecord,
                    { finished: false, wasFinishedBefore: true },
                    t.dictation.practice
                  )
                : null
            }
            next={picked.kind === 'done' ? null : picked.data}
            progress={progress}
            stats={stats}
            thumbnailUrl={video.thumbnailUrl}
            title={video.title}
            videoId={videoId}
            youtubeVideoId={video.youtubeVideoId}
          />
        )}

        {isEmpty ? null : (
          <>
            {/* The AI coach sits right under the head: the one extra step
                worth taking here, so it is easy to find and press. */}
            <DictationDebriefPanel
              canGenerate={progress === 'completed'}
              initialDebrief={
                latestDebrief ? toDictationDebriefRecord(latestDebrief) : null
              }
              videoId={videoId}
            />
            <DictationStatsPanel stats={stats} />
          </>
        )}
      </section>
    </PageShell>
  )
}
