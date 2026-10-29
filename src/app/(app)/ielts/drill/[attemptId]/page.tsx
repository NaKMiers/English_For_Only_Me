import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { IeltsRunner } from '@/components/ielts/runner/IeltsRunner'
import { loadResultPageData } from '@/modules/ielts/services/resultPageData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = { title: 'IELTS Drill' }

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
    <div className="ielts-exam fixed inset-0 z-[70] flex flex-col">
      <IeltsRunner
        attempt={data.attempt}
        backHref="/ielts"
        sections={data.sections}
        testTitle={data.attempt.testTitle}
      />
    </div>
  )
}
