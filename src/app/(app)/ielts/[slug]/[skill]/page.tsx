import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AttemptLoader } from '@/components/ielts/runner/AttemptLoader'
import { IELTS_SKILL_LABELS, type IeltsSkill } from '@/modules/ielts/constants'
import { loadRunnerPageData } from '@/modules/ielts/services/runnerPageData'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = { title: 'IELTS Practice' }

function skillLink(slug: string, skill: IeltsSkill | null) {
  return skill
    ? { href: `/ielts/${slug}/${skill}`, label: IELTS_SKILL_LABELS[skill] }
    : null
}

interface Props {
  params: Promise<{ slug: string; skill: string }>
  searchParams: Promise<{ part?: string | string[] }>
}

export default async function IeltsPracticePage({
  params,
  searchParams,
}: Props) {
  const [{ slug, skill }, { part }] = await Promise.all([params, searchParams])
  const data = await loadRunnerPageData({
    mode: 'practice',
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
        mode="practice"
        next={skillLink(data.testSlug, data.nextSkill)}
        prev={skillLink(data.testSlug, data.prevSkill)}
        startPart={data.startPart}
        sections={data.sections}
        skill={data.skill}
        testSlug={data.testSlug}
        testTitle={data.testTitle}
      />
    </div>
  )
}
