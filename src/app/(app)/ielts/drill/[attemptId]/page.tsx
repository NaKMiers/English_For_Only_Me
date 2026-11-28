import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { IeltsRunner } from '@/components/ielts/runner/IeltsRunner'
import { getMessages } from '@/i18n/server'
import { loadResultPageData } from '@/modules/ielts/services/resultPageData'
import { ExamFrame } from '@/components/ielts/ui'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return { title: t.ielts.meta.drillTitle }
}

interface Props {
  params: Promise<{ attemptId: string }>
}

/** A drill runs in the practice runner; a finished one goes to its result. */
export default async function IeltsDrillPage({ params }: Props) {
  const { attemptId } = await params
  const data = await loadResultPageData(attemptId)

  if (!data || data.attempt.mode !== 'drill') notFound()

  if (data.attempt.status !== 'in_progress')
    redirect(`/ielts/attempts/${data.attempt.id}`)

  return (
    <ExamFrame>
      <IeltsRunner
        attempt={data.attempt}
        backHref="/ielts"
        sections={data.sections}
        testTitle={data.attempt.testTitle}
      />
    </ExamFrame>
  )
}
