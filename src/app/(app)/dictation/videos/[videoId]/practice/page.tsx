import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { ContentPanel } from '@/components/common/ContentPanel'
import { DictationPracticeShell } from '@/components/dictation/DictationPracticeShell'
import type { PracticeNextVideo } from '@/components/dictation/practice/PracticeFinish'
import { ActionButton } from '@/components/ui/ActionButton'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import {
  getCachedTopicCatalog,
  getCachedTopics,
} from '@/modules/dictation/content/catalogReaders'
import { getCompletionCountForVideo } from '@/modules/dictation/content/progressRepository'
import {
  buildInitialTranslationTrack,
  buildPracticeSegments,
} from '@/modules/dictation/practice/practicePageData'
import { nextVideoInTopic } from '@/modules/dictation/practice/nextVideo'
import { loadInitialTranslationCues } from '@/modules/dictation/practice/practiceTranslations'
import { loadSegmentProgressRows } from '@/modules/dictation/practice/segmentProgressService'
import { PRACTICE_SEGMENT_FIELDS } from '@/modules/dictation/services/dictationSegmentRecords'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'
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
        <ContentPanel
          eyebrow={t.dictation.practice.emptyEyebrow}
          title={title}
        >
          <p className="text-ink-soft text-base leading-7 font-normal">
            {message}
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Learners only get the way back: importing and transcripts
                are admin work, reached from the admin pages. */}
            <ActionButton href="/dictation">{text.backToLab}</ActionButton>
          </div>
        </ContentPanel>
      </section>
    </PageShell>
  )
}

/**
 * The finish screen's next stop: the next video of this video's topic, from
 * the cached catalog only (no query per request). Null for the last video
 * or a video with no topic; the finish screen then points at the landing.
 */
async function findNextVideo(
  video: DictationVideoApiRecord
): Promise<PracticeNextVideo | null> {
  if (!video.topicId) return null

  try {
    const topic = (await getCachedTopics()).find(
      item => item.id === video.topicId
    )
    const catalog = topic ? await getCachedTopicCatalog(topic.slug) : null
    const next = catalog ? nextVideoInTopic(catalog, video.id) : null

    return next && topic
      ? {
          href: `/dictation/videos/${next.id}/practice`,
          title: next.title,
          topicTitle: topic.title,
        }
      : null
  } catch (error) {
    // A cold or failing catalog read only loses the next stop's target.
    console.error('Next video lookup failed.', error)
    return null
  }
}

export default async function Page({ params }: Props) {
  const { videoId } = await params

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

  const nextVideo = await findNextVideo(videoRecord)

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
          completions={completions}
          initialSession={session ? toDictationSessionRecord(session) : null}
          nextVideo={nextVideo}
          initialTranslationTrack={buildInitialTranslationTrack(
            segments,
            translations.firstTrack
          )}
          segments={buildPracticeSegments(segments, progressRows)}
          translationLanguages={translations.languages}
          video={{
            id: videoRecord.id,
            level: videoRecord.level,
            title: videoRecord.title,
            youtubeVideoId: videoRecord.youtubeVideoId,
          }}
        />
      </section>
    </PageShell>
  )
}
