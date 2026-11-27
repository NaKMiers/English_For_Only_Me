import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { DictationImportForm } from '@/components/dictation/DictationImportForm'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'
import { toDictationTranscriptRecord } from '@/modules/dictation/services/dictationTranscriptRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'
import { normalizeTranslationLanguage } from '@/modules/dictation/translations/languages'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.admin.editPage.metaTitle,
    description: t.admin.editPage.metaDescription,
  }
}

export const runtime = 'nodejs'

interface Props {
  params: Promise<{
    videoId: string
  }>
}

async function EditUnavailableState({
  message,
  title,
}: {
  message: string
  title: string
}) {
  const t = await getMessages()

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle={t.admin.shell.editDesk}
        />
      }
    >
      <section className="px-4 pb-6 md:pr-6 md:pl-0">
        <div className="border-line bg-surface rounded-panel border p-5">
          <PageTag tone="red">{t.admin.editPage.tag}</PageTag>
          <h1 className="mt-4 font-sans text-[clamp(2rem,6vw,4rem)] leading-none font-medium tracking-normal">
            {title}
          </h1>
          <p className="text-ink-soft mt-4 max-w-3xl text-base leading-7 font-normal">
            {message}
          </p>
        </div>
      </section>
    </PageShell>
  )
}

export default async function Page({ params }: Props) {
  const { videoId } = await params

  // Editing mutates catalog content, so only an admin may open it.
  const user = await getOptionalUser()
  if (!user)
    redirect(
      `/api/auth/signin?callbackUrl=/admin/dictation/videos/${videoId}/edit`
    )

  if (user.role !== 'admin') redirect('/dictation')

  const t = await getMessages()

  if (!/^[a-f\d]{24}$/i.test(videoId)) notFound()

  if (!hasMongoDbUri())
    return (
      <EditUnavailableState
        title={t.admin.editPage.mongoMissingTitle}
        message={t.admin.editPage.mongoMissingMessage}
      />
    )

  await connectDatabase()

  const video = await DictationVideoModel.findOne({
    _id: videoId,
    status: {
      $ne: 'archived',
    },
  }).lean()

  if (!video) notFound()

  const trackDocuments = await DictationTranscriptModel.find({
    videoId: video._id,
  })
    .sort({ language: 1 })
    .lean()
  const tracks = trackDocuments.map(toDictationTranscriptRecord)
  const primaryLanguage = normalizeTranslationLanguage(video.defaultLanguage)
  const translationTracks = trackDocuments
    .filter(
      track =>
        normalizeTranslationLanguage(track.language) !== primaryLanguage &&
        track.cueCount > 0
    )
    .map(track => ({
      language: track.language,
      cues: (track.rawCues ?? []).map(cue => ({
        endMs: cue.endMs ?? null,
        startMs: cue.startMs ?? null,
        text: cue.text,
      })),
    }))
  const segmentDocuments = video.activeTranscriptId
    ? await DictationSegmentModel.find({
        videoId: video._id,
        transcriptId: video.activeTranscriptId,
      })
        .sort({ order: 1 })
        .lean()
    : []
  const segments = segmentDocuments.map(toDictationSegmentRecord)

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle={t.admin.shell.editDesk}
        />
      }
    >
      <div className="grid gap-5 p-3 sm:p-5">
        <section
          aria-labelledby="dictation-edit-title"
          className="border-line bg-surface/92 rounded-panel grid min-w-0 overflow-hidden border"
        >
          <div className="border-line bg-surface/90 flex min-w-0 flex-wrap items-start justify-between gap-4 border-b p-4 sm:p-5">
            <div className="grid min-w-0 gap-3">
              <p className="text-brand text-xs leading-tight font-semibold tracking-normal">
                {t.admin.editPage.eyebrow}
              </p>
              <h1
                id="dictation-edit-title"
                className="font-sans text-[clamp(2rem,7vw,4.75rem)] leading-none font-medium tracking-normal wrap-break-word"
              >
                {t.admin.editPage.title}
              </h1>
              <p className="text-ink-soft max-w-3xl text-base leading-7 font-normal">
                {t.admin.editPage.intro}
              </p>
            </div>
            <PageTag tone="red">{t.admin.editPage.tag}</PageTag>
          </div>

          <div className="p-4 sm:p-5">
            <DictationImportForm
              initialActiveTranscriptId={
                video.activeTranscriptId
                  ? String(video.activeTranscriptId)
                  : null
              }
              initialSegments={segments}
              initialTracks={tracks}
              initialTranslationTracks={translationTracks}
              initialVideo={toDictationVideoRecord(video)}
              mode="edit"
            />
          </div>
        </section>
      </div>
    </PageShell>
  )
}
