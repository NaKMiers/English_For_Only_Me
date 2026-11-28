import { GraduationCap } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { IeltsResultHead } from '@/components/ielts/review/IeltsResultHead'
import { ObjectiveResult } from '@/components/ielts/review/ObjectiveResult'
import { WritingResult } from '@/components/ielts/review/WritingResult'
import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { listIeltsAttempts } from '@/modules/ielts/attempts/attemptQueries'
import { IELTS_SKILLS } from '@/modules/ielts/constants'
import { readPublishedIeltsTest } from '@/modules/ielts/tests/testReaders'
import { loadResultPageData } from '@/modules/ielts/services/resultPageData'
import { ExamSheet } from '@/components/ielts/ui'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return { title: t.ielts.meta.resultTitle }
}

interface Props {
  params: Promise<{ attemptId: string }>
}

export default async function IeltsResultPage({ params }: Props) {
  const { attemptId } = await params
  const [data, t] = await Promise.all([
    loadResultPageData(attemptId),
    getMessages(),
  ])

  if (!data) notFound()

  const { attempt } = data

  // Still running: back to the runner it belongs to.
  if (attempt.status === 'in_progress') {
    if (attempt.mode === 'drill') redirect(`/ielts/drill/${attempt.id}`)

    const base = `/ielts/${attempt.testSlug}/${attempt.skill}${attempt.mode === 'mock' ? '/mock' : ''}`

    redirect(
      attempt.scope.kind === 'part'
        ? `${base}?part=${attempt.scope.part}`
        : base
    )
  }

  const title = attempt.testTitle || t.ielts.history.drill
  const skillLabel = t.ielts.skills[attempt.skill]
  // Fresh journey data for the head, read with the queries the test page
  // already uses: the published test (cached) and this test's attempts.
  const actorId = await getPracticeActorId()
  const [test, history] = await Promise.all([
    attempt.testSlug
      ? readPublishedIeltsTest(attempt.testSlug).catch(() => null)
      : Promise.resolve(null),
    actorId && attempt.testSlug
      ? listIeltsAttempts(actorId, {
          limit: 20,
          testSlug: attempt.testSlug,
        }).catch(() => [])
      : Promise.resolve([]),
  ])
  const breadcrumb = [
    { href: '/ielts', label: t.common.modules.ielts.title },
    ...(attempt.testSlug
      ? [{ href: `/ielts/${attempt.testSlug}`, label: title }]
      : []),
    { label: skillLabel },
  ]
  const summary = [
    t.ielts.modes[attempt.mode],
    attempt.scope.kind === 'part'
      ? format(t.ielts.parts.part, { part: attempt.scope.part })
      : null,
    attempt.status === 'expired' ? t.ielts.result.timeUp : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/ielts"
          page={{
            breadcrumb,
            module: 'ielts',
            title: format(t.ielts.result.heading, { skill: skillLabel }),
          }}
          subtitle={t.ielts.shell.subtitle}
        />
      }
    >
      <ExamSheet>
        <PageHeader
          breadcrumb={{ items: breadcrumb, label: t.common.journey.breadcrumb }}
          icon={<GraduationCap />}
          iconClassName="bg-pastel-peach text-accent-orange"
          inTopbar
          subtitle={summary}
          title={format(t.ielts.result.heading, { skill: skillLabel })}
          titleClassName="wrap-break-word"
        />
        <IeltsResultHead
          attempt={{
            band:
              attempt.skill === 'writing'
                ? attempt.writingBand
                : (attempt.result?.band ?? null),
            id: attempt.id,
            result: attempt.result
              ? {
                  band: attempt.result.band ?? null,
                  raw: attempt.result.raw,
                  total: attempt.result.total,
                }
              : null,
            skill: attempt.skill,
            testSlug: attempt.testSlug,
          }}
          history={history}
          messages={t}
          test={
            test
              ? {
                  id: test.id,
                  skills: IELTS_SKILLS.filter(skill =>
                    test.sections.some(section => section.skill === skill)
                  ),
                  targetBand: test.targetBand,
                }
              : null
          }
        />
        {attempt.skill === 'writing' ? (
          <WritingResult
            attempt={attempt}
            tasks={data.writing}
          />
        ) : (
          <ObjectiveResult
            attempt={attempt}
            rows={data.rows}
            sections={data.sections}
          />
        )}
      </ExamSheet>
    </PageShell>
  )
}
