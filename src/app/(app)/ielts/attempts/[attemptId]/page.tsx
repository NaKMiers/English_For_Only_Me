import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { ObjectiveResult } from '@/components/ielts/review/ObjectiveResult'
import { WritingResult } from '@/components/ielts/review/WritingResult'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import { loadResultPageData } from '@/modules/ielts/services/resultPageData'
import { ExamSheet, ExamHero } from '@/components/ielts/ui'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = { title: 'IELTS · Result' }

interface Props {
  params: Promise<{ attemptId: string }>
}

const MODE_LABELS = { practice: 'Practice', mock: 'Mock', drill: 'Drill' }

export default async function IeltsResultPage({ params }: Props) {
  const { attemptId } = await params
  const data = await loadResultPageData(attemptId)

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

  const title = attempt.testTitle || 'Drill'

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/ielts"
          authControl={<AuthControl />}
          subtitle="IELTS practice: Listening, Reading, Writing"
        />
      }
    >
      <ExamSheet>
        <ExamHero>
          <nav
            aria-label="Breadcrumb"
            className="text-muted-foreground text-sm font-semibold"
          >
            <Link
              className="hover:text-manga-red underline"
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
            / {IELTS_SKILL_LABELS[attempt.skill]}
          </nav>
          <h1 className="font-sans text-3xl leading-tight font-black wrap-break-word sm:text-4xl">
            {IELTS_SKILL_LABELS[attempt.skill]} result
          </h1>
          <p>
            {MODE_LABELS[attempt.mode]}
            {attempt.scope.kind === 'part'
              ? ` · Part ${attempt.scope.part}`
              : ''}
            {attempt.status === 'expired' ? ' · Time up' : ''}
          </p>
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
    </MangaPageShell>
  )
}
