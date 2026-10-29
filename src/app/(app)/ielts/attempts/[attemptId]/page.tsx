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
import { ExamSheet } from '@/components/ielts/ui'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata: Metadata = { title: 'IELTS · Kết quả' }

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
          subtitle="Luyện đề IELTS: Listening, Reading, Writing"
        />
      }
    >
      <ExamSheet>
        <header className="grid gap-2">
          <nav
            aria-label="Breadcrumb"
            className="text-ex-muted text-sm"
          >
            <Link
              className="hover:text-ex-accent underline"
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
          <h1 className="text-ex-ink font-sans text-2xl leading-tight font-bold sm:text-3xl">
            Kết quả {IELTS_SKILL_LABELS[attempt.skill]}
          </h1>
          <p>
            {MODE_LABELS[attempt.mode]}
            {attempt.scope.kind === 'part'
              ? ` · Part ${attempt.scope.part}`
              : ''}
            {attempt.status === 'expired' ? ' · Hết giờ' : ''}
          </p>
        </header>
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
