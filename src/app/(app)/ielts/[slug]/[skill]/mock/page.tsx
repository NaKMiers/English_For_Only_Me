import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AttemptLoader } from '@/components/ielts/runner/AttemptLoader'
import { loadRunnerPageData } from '@/modules/ielts/services/runnerPageData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = { title: 'IELTS Mock' }

interface Props {
  params: Promise<{ slug: string; skill: string }>
  searchParams: Promise<{ part?: string | string[] }>
}

export default async function IeltsMockPage({ params, searchParams }: Props) {
  const [{ slug, skill }, { part }] = await Promise.all([params, searchParams])
  const data = await loadRunnerPageData({
    mode: 'mock',
    partParam: part,
    skillParam: skill,
    slug,
  })

  if (!data) notFound()

  return (
    <div className="ielts-exam fixed inset-0 z-[70] flex flex-col">
      <AttemptLoader
        backHref={`/ielts/${data.testSlug}`}
        key={`${data.skill}-${data.startPart ?? 'first'}`}
        mode="mock"
        startPart={data.startPart}
        sections={data.sections}
        skill={data.skill}
        testSlug={data.testSlug}
        testTitle={data.testTitle}
      />
    </div>
  )
}
