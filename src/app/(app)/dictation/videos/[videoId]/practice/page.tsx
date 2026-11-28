import { Headphones } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { DictationPracticeShell } from '@/components/dictation/DictationPracticeShell'
import { EmptyState } from '@/components/journey/EmptyState'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { getCompletionCountForVideo } from '@/modules/dictation/content/progressRepository'
import {
  buildInitialTranslationTrack,
  buildPracticeSegments,
} from '@/modules/dictation/practice/practicePageData'
import { findNextVideo } from '@/modules/dictation/practice/findNextVideo'
import { loadInitialTranslationCues } from '@/modules/dictation/practice/practiceTranslations'
import { loadSegmentProgressRows } from '@/modules/dictation/practice/segmentProgressService'
import { loadVideoTopicRecord } from '@/modules/dictation/practice/topicRecord'
import {
  parseReviewSegmentParam,
  pickNextReview,
} from '@/modules/dictation/review/reviewDeepLink'
import { listDueReviewItemsForUser } from '@/modules/dictation/review/reviewItemService'
import { PRACTICE_SEGMENT_FIELDS } from '@/modules/dictation/services/dictationSegmentRecords'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.dictation.meta.practiceTitle,
    description: t.dictation.meta.practiceDescription,
  }
}

export const runtime = 'nodejs'

interface Props {
  params: Promise<{
    videoId: string
  }>
  /** `segment`: the review queue's deep link to one weak sentence. */
  searchParams: Promise<{
    segment?: string | string[]
  }>
}

async function PracticeSetupState({
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
        {/* Learners only get the way back: importing and transcripts are
            admin work, reached from the admin pages. */}
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

/**
 * Review mode for one weak sentence: the session that recorded its last
 * attempt (reused as it is, its position and status never change) and where
 * the learner goes after it. Null when the learner never tried the sentence,
 * so the page opens as normal practice.
 */
async function loadReviewTarget({
  segmentId,
  userId,
}: {
  segmentId: string
  userId: string
}) {
  const [lastAttempt, dueItems] = await Promise.all([
    DictationAttemptModel.findOne({ segmentId, userId })
      .sort({ createdAt: -1 })
      .select('sessionId')
      .lean(),
    listDueReviewItemsForUser({ limit: 30, userId }),
  ])

  if (!lastAttempt) return null

  const next = pickNextReview(dueItems, segmentId)

  return {
    left: next.left,
    nextHref: next.href,
    segmentId,
    sessionId: String(lastAttempt.sessionId),
  }
}

export default async function Page({ params, searchParams }: Props) {
  const [{ videoId }, { segment: segmentParam }] = await Promise.all([
    params,
    searchParams,
  ])

  if (!/^[a-f\d]{24}$/i.test(videoId)) notFound()

  const t = await getMessages()
  const text = t.dictation.setup

  if (!hasMongoDbUri())
    return (
      <PracticeSetupState
        title={text.noDatabaseTitle}
        message={text.practiceNoDatabase}
      />
    )

  // Practice is open to everyone - a signed-in user resumes their own session,
  // an anonymous guest resumes the one tied to their guest cookie (null until
  // they start practicing, in which case the shell creates one).
  const [actorId] = await Promise.all([getPracticeActorId(), connectDatabase()])

  // Everything keyed only by the URL's video id and the learner starts with
  // the video lookup instead of waiting for it.
  const [video, session, completions, progressRows] = await Promise.all([
    DictationVideoModel.findOne({
      _id: videoId,
      status: {
        $ne: 'archived',
      },
    }).lean(),
    actorId
      ? DictationSessionModel.findOne({
          userId: actorId,
          status: 'active',
          videoId,
        })
          .sort({ lastActiveAt: -1 })
          .lean()
      : null,
    actorId ? getCompletionCountForVideo(actorId, videoId) : 0,
    // Per-learner progress, never the shared segment's fields (see
    // segmentProgress.ts).
    loadSegmentProgressRows({ userId: actorId, videoId }),
  ])

  if (!video) notFound()

  const videoRecord = toDictationVideoRecord(video)

  if (!hasDictationTranscript(videoRecord))
    return (
      <PracticeSetupState
        title={text.transcriptNeededTitle}
        message={text.practiceTranscriptNeeded}
      />
    )

  const [segments, translations] = await Promise.all([
    DictationSegmentModel.find({
      videoId: video._id,
      transcriptId: video.activeTranscriptId,
    })
      .select(PRACTICE_SEGMENT_FIELDS)
      .sort({ order: 1 })
      .lean(),
    loadInitialTranslationCues({
      defaultLanguage: video.defaultLanguage,
      videoId,
    }),
  ])

  const reviewSegmentId = actorId
    ? parseReviewSegmentParam(
        segmentParam,
        segments.map(segment => String(segment._id))
      )
    : null
  const [nextVideo, review, topicRecord] = await Promise.all([
    findNextVideo(videoRecord),
    reviewSegmentId && actorId
      ? loadReviewTarget({ segmentId: reviewSegmentId, userId: actorId })
      : null,
    loadVideoTopicRecord({ topicId: videoRecord.topicId, userId: actorId }),
  ])

  if (segments.length === 0)
    return (
      <PracticeSetupState
        title={text.segmentsNotReadyTitle}
        message={text.segmentsNotReady}
      />
    )

  return (
    // No topbar: practice is a focus screen, and the exercise header carries
    // the logo home link in place of the app nav.
    <PageShell
      fullHeight
      // The dashed inner frame would run under the flattened practice layout.
      className="max-sm:after:hidden"
    >
      <section className="h-full min-h-0 p-2 sm:p-3">
        <DictationPracticeShell
          // A new sentence from the queue (same video, new `?segment=`) or the
          // way back to normal practice starts the shell afresh.
          key={review?.segmentId ?? 'practice'}
          completions={completions}
          initialSession={session ? toDictationSessionRecord(session) : null}
          nextVideo={nextVideo}
          review={review}
          initialTranslationTrack={buildInitialTranslationTrack(
            segments,
            translations.firstTrack
          )}
          segments={buildPracticeSegments(segments, progressRows)}
          topicRecord={topicRecord}
          translationLanguages={translations.languages}
          video={{
            id: videoRecord.id,
            level: videoRecord.level,
            title: videoRecord.title,
            topicId: videoRecord.topicId,
            youtubeVideoId: videoRecord.youtubeVideoId,
          }}
        />
      </section>
    </PageShell>
  )
}
