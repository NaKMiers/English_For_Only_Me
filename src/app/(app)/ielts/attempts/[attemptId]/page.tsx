import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { ObjectiveResult } from '@/components/ielts/review/ObjectiveResult'
import { WritingResult } from '@/components/ielts/review/WritingResult'
import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import { loadResultPageData } from '@/modules/ielts/services/resultPageData'
import { ExamSheet, ExamHero } from '@/components/ielts/ui'

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
  const skillLabel = IELTS_SKILL_LABELS[attempt.skill]
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
          authControl={<AuthControl />}
          subtitle={t.ielts.shell.subtitle}
        />
      }
    >
      <ExamSheet>
        <ExamHero>
          <nav
            aria-label={t.ielts.shell.breadcrumb}
            className="text-muted-foreground text-sm font-semibold"
          >
            <Link
              className="hover:text-brand underline"
              href="/ielts"
            >
              IELTS
            </Link>
            {attempt.testSlug ? (
              <>
                {' / '}
                <Link
                  className="underline"
                  href={`/ielts/${attempt.testSlug}`}
                >
                  {title}
                </Link>
              </>
            ) : null}{' '}
            / {skillLabel}
          </nav>
          <h1 className="font-sans text-3xl leading-tight font-medium wrap-break-word sm:text-4xl">
            {format(t.ielts.result.heading, { skill: skillLabel })}
          </h1>
          <p>{summary}</p>
        </ExamHero>
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
