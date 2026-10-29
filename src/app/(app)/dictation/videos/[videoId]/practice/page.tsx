import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { DictationPracticeShell } from '@/components/dictation/DictationPracticeShell'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { getCompletionCountForVideo } from '@/modules/dictation/content/progressRepository'
import {
  buildInitialTranslationTrack,
  buildPracticeSegments,
} from '@/modules/dictation/practice/practicePageData'
import { loadInitialTranslationCues } from '@/modules/dictation/practice/practiceTranslations'
import { loadSegmentProgressRows } from '@/modules/dictation/practice/segmentProgressService'
import { PRACTICE_SEGMENT_FIELDS } from '@/modules/dictation/services/dictationSegmentRecords'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export const metadata: Metadata = {
  title: 'Dictation Practice',
  description: 'Practice sentence-level YouTube dictation for IELTS listening.',
}

export const runtime = 'nodejs'

interface Props {
  params: Promise<{
    videoId: string
  }>
}

function PracticeSetupState({
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
          eyebrow="Practice"
          title={title}
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            {message}
          </p>
          <div className="flex flex-wrap gap-3">
            <MangaButton href="/dictation">Back To Dictation Lab</MangaButton>
            {videoId ? (
              <MangaButton href={`/admin/dictation/videos/${videoId}/edit`}>
                Add Transcript
              </MangaButton>
            ) : null}
            <MangaButton
              href="/admin/dictation/import"
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
      <PracticeSetupState
        title="MongoDB is not configured"
        message="Set MONGODB_URI on the server before opening a saved practice session."
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
        title="Transcript is needed"
        message="Attach an English transcript before opening the practice player for this video."
        videoId={videoId}
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

  if (segments.length === 0)
    return (
      <PracticeSetupState
        title="Segments are not ready"
        message="This video has no practice segments yet. Segments are built automatically when its transcript is saved - re-open it in admin and save the captions to rebuild."
        videoId={videoId}
      />
    )

  return (
    // No topbar: practice is a focus screen, and the exercise header carries
    // the logo home link in place of the app nav.
    <MangaPageShell
      fullHeight
      // The dashed inner frame would run under the flattened practice layout.
      className="max-sm:after:hidden"
    >
      <section className="h-full min-h-0 p-2 sm:p-3">
        <DictationPracticeShell
          completions={completions}
          initialSession={session ? toDictationSessionRecord(session) : null}
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
    </MangaPageShell>
  )
}
