import { ChevronRight, GraduationCap } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { ObjectiveResult } from '@/components/ielts/review/ObjectiveResult'
import { WritingResult } from '@/components/ielts/review/WritingResult'
import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
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
        <PageHeader
          eyebrow={
            <nav
              aria-label={t.ielts.shell.breadcrumb}
              className="flex flex-wrap items-center gap-x-1.5"
            >
              <Link
                className="hover:text-brand"
                href="/ielts"
              >
                IELTS
              </Link>
              {attempt.testSlug ? (
                <>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-3.5"
                  />
                  <Link
                    className="hover:text-brand"
                    href={`/ielts/${attempt.testSlug}`}
                  >
                    {title}
                  </Link>
                </>
              ) : null}
              <ChevronRight
                aria-hidden="true"
                className="size-3.5"
              />
              <span>{skillLabel}</span>
            </nav>
          }
          icon={<GraduationCap />}
          iconClassName="bg-pastel-peach text-accent-orange"
          subtitle={summary}
          title={format(t.ielts.result.heading, { skill: skillLabel })}
          titleClassName="wrap-break-word"
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
