import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { DictationBuildSegmentsButton } from '@/components/dictation/DictationBuildSegmentsButton'
import { DictationPracticeShell } from '@/components/dictation/DictationPracticeShell'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
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
  transcriptId,
  videoId,
}: {
  message: string
  title: string
  transcriptId?: string | null
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
              <MangaButton href={`/admin/videos/${videoId}/edit`}>
                Add Transcript
              </MangaButton>
            ) : null}
            <MangaButton
              href="/admin/import"
              tone="paper"
            >
              Import Video
            </MangaButton>
            {transcriptId ? (
              <DictationBuildSegmentsButton transcriptId={transcriptId} />
            ) : null}
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

  const ownerId = await getCurrentOwnerId()

  await connectDatabase()

  const video = await DictationVideoModel.findOne({
    _id: videoId,
    status: {
      $ne: 'archived',
    },
  }).lean()

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

  const segments = await DictationSegmentModel.find({
    videoId: video._id,
    transcriptId: video.activeTranscriptId,
  })
    .sort({ order: 1 })
    .lean()

  if (segments.length === 0)
    return (
      <PracticeSetupState
        title="Segments are not ready"
        message="Build sentence segments from the active transcript before opening the practice player."
        transcriptId={
          video.activeTranscriptId ? String(video.activeTranscriptId) : null
        }
      />
    )

  const session = await DictationSessionModel.findOne({
    ownerId,
    status: 'active',
    videoId: video._id,
  })
    .sort({ lastActiveAt: -1 })
    .lean()

  const trackDocuments = await DictationTranscriptModel.find({
    videoId: video._id,
    language: { $ne: video.defaultLanguage },
    cueCount: { $gt: 0 },
  })
    .sort({ language: 1 })
    .lean()
  const translationTracks = trackDocuments.map(doc => ({
    language: doc.language,
    cues: (doc.rawCues ?? []).map(cue => ({
      text: cue.text,
      startMs: cue.startMs ?? null,
      endMs: cue.endMs ?? null,
    })),
  }))

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
        <DictationPracticeShell
          initialSession={session ? toDictationSessionRecord(session) : null}
          segments={segments.map(toDictationSegmentRecord)}
          translationTracks={translationTracks}
          video={videoRecord}
        />
      </section>
    </MangaPageShell>
  )
}
