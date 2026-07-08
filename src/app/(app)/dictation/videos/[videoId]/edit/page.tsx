import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { DictationImportForm } from '@/components/dictation/DictationImportForm'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationTranscriptRecord } from '@/modules/dictation/services/dictationTranscriptRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'

export const metadata: Metadata = {
  title: 'Edit Dictation Video',
  description: 'Attach transcript source text to a saved dictation video.',
}

export const runtime = 'nodejs'

interface Props {
  params: Promise<{
    videoId: string
  }>
}

function EditUnavailableState({
  message,
  title,
}: {
  message: string
  title: string
}) {
  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab edit desk"
        />
      }
    >
      <section className="p-4 sm:p-6 lg:p-8">
        <div className="border-manga-black bg-manga-white border-3 p-5 shadow-[6px_6px_0_var(--manga-black)]">
          <PageTag tone="red">Edit</PageTag>
          <h1 className="mt-4 font-sans text-[clamp(2rem,6vw,4rem)] leading-none font-black tracking-normal uppercase">
            {title}
          </h1>
          <p className="text-manga-ink-soft mt-4 max-w-3xl text-base leading-7 font-semibold">
            {message}
          </p>
        </div>
      </section>
    </MangaPageShell>
  )
}

export default async function Page({ params }: Props) {
  const { videoId } = await params

  if (!/^[a-f\d]{24}$/i.test(videoId)) notFound()

  if (!hasMongoDbUri())
    return (
      <EditUnavailableState
        title="MongoDB is not configured"
        message="Set MONGODB_URI on the server before editing saved dictation videos."
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

  const trackDocuments = await DictationTranscriptModel.find({
    ownerId,
    videoId: video._id,
  })
    .sort({ language: 1 })
    .lean()
  const tracks = trackDocuments.map(toDictationTranscriptRecord)

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab edit desk"
        />
      }
    >
      <div className="grid gap-5 p-3 sm:p-5">
        <section
          aria-labelledby="dictation-edit-title"
          className="border-manga-black bg-manga-white/92 grid min-w-0 overflow-hidden border-3 shadow-[6px_6px_0_var(--manga-black)]"
        >
          <div className="border-manga-black bg-manga-white/90 flex min-w-0 flex-wrap items-start justify-between gap-4 border-b-3 p-4 sm:p-5">
            <div className="grid min-w-0 gap-3">
              <p className="text-manga-red text-xs leading-tight font-black tracking-normal uppercase">
                Listening module edit page
              </p>
              <h1
                id="dictation-edit-title"
                className="font-sans text-[clamp(2rem,7vw,4.75rem)] leading-none font-black tracking-normal wrap-break-word uppercase"
              >
                Add Missing Transcript
              </h1>
              <p className="text-manga-ink-soft max-w-3xl text-base leading-7 font-semibold">
                Attach the English transcript source for this saved YouTube
                video, then the app will build sentence segments for practice.
              </p>
            </div>
            <PageTag tone="red">Edit</PageTag>
          </div>

          <div className="p-4 sm:p-5">
            <DictationImportForm
              initialActiveTranscriptId={
                video.activeTranscriptId
                  ? String(video.activeTranscriptId)
                  : null
              }
              initialTracks={tracks}
              initialVideo={toDictationVideoRecord(video)}
              mode="edit"
            />
          </div>
        </section>
      </div>
    </MangaPageShell>
  )
}
