import { PenLine } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { DictationImportForm } from '@/components/dictation/DictationImportForm'
import { PageHeader } from '@/components/common/PageHeader'
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
    <PageShell topbar={<AppTopbar subtitle={t.admin.shell.editDesk} />}>
      <section className="px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          breadcrumb={{
            items: [
              { href: '/admin', label: t.admin.dashboard.title },
              {
                href: '/admin/dictation',
                label: t.common.modules.dictation.title,
              },
              { label: t.admin.editPage.title },
            ],
            label: t.common.journey.breadcrumb,
          }}
          icon={<PenLine />}
          iconClassName="bg-pastel-sky text-accent-blue"
          subtitle={message}
          title={title}
        />
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
    <PageShell topbar={<AppTopbar subtitle={t.admin.shell.editDesk} />}>
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          breadcrumb={{
            items: [
              { href: '/admin', label: t.admin.dashboard.title },
              {
                href: '/admin/dictation',
                label: t.common.modules.dictation.title,
              },
              { label: t.admin.editPage.title },
            ],
            label: t.common.journey.breadcrumb,
          }}
          icon={<PenLine />}
          iconClassName="bg-pastel-sky text-accent-blue"
          subtitle={t.admin.editPage.intro}
          title={t.admin.editPage.title}
        />
        {/* The form is made of its own cards: no card around them. */}
        <DictationImportForm
          initialActiveTranscriptId={
            video.activeTranscriptId ? String(video.activeTranscriptId) : null
          }
          initialSegments={segments}
          initialTracks={tracks}
          initialTranslationTracks={translationTracks}
          initialVideo={toDictationVideoRecord(video)}
          mode="edit"
        />
      </section>
    </PageShell>
  )
}
