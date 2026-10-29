import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabaseWhen } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import {
  type IeltsAttemptSummary,
  listIeltsAttempts,
} from '@/modules/ielts/attempts/attemptQueries'
import {
  IELTS_SKILL_LABELS,
  IELTS_SKILLS,
  IELTS_TIMERS,
  type IeltsSkill,
} from '@/modules/ielts/constants'
import type { IeltsSection } from '@/modules/ielts/schema'
import { readPublishedIeltsTest } from '@/modules/ielts/tests/testReaders'
import {
  ExamBadge,
  ExamButton,
  ExamCard,
  ExamSheet,
} from '@/components/ielts/ui'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  return { title: `IELTS · ${slug}` }
}

function partMinutes(section: IeltsSection) {
  if (section.skill === 'listening') {
    const seconds = section.listening?.audio?.durationSec ?? 0

    return seconds ? `${Math.ceil(seconds / 60)} phút audio` : 'chưa có audio'
  }

  if (section.skill === 'reading')
    return `${IELTS_TIMERS.readingPart / 60} phút`

  return section.writing?.task === 1
    ? `${IELTS_TIMERS.writingTask1 / 60} phút`
    : `${IELTS_TIMERS.writingTask2 / 60} phút`
}

function partLabel(section: IeltsSection) {
  if (section.skill === 'writing')
    return `Task ${section.writing?.task ?? section.order}`

  return section.skill === 'listening'
    ? `Part ${section.order}`
    : `Passage ${section.order}`
}

function lastAttempt(attempts: IeltsAttemptSummary[], skill: IeltsSkill) {
  return attempts.find(
    attempt => attempt.skill === skill && attempt.status !== 'in_progress'
  )
}

export default async function IeltsTestPage({ params }: Props) {
  const { slug } = await params

  if (!hasMongoDbUri() || !/^[a-z0-9-]{1,80}$/.test(slug)) notFound()

  const actorId = await connectDatabaseWhen(getPracticeActorId())
  const [test, attempts] = await Promise.all([
    readPublishedIeltsTest(slug),
    actorId
      ? listIeltsAttempts(actorId, { testSlug: slug, limit: 20 })
      : Promise.resolve([]),
  ])

  if (!test) notFound()

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
            </Link>{' '}
            / {test.title}
          </nav>
          <div className="flex flex-wrap gap-2">
            <ExamBadge tone="pale">
              {test.track === 'general' ? 'General Training' : 'Academic'}
            </ExamBadge>
            <ExamBadge>Mục tiêu {test.targetBand}</ExamBadge>
          </div>
          <h1 className="text-ex-ink font-sans text-2xl leading-tight font-bold sm:text-3xl">
            {test.title}
          </h1>
          {test.description ? (
            <p className="max-w-2xl">{test.description}</p>
          ) : null}
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {IELTS_SKILLS.map(skill => {
            const parts = test.sections
              .filter(section => section.skill === skill)
              .sort((left, right) => left.order - right.order)
            const last = lastAttempt(attempts, skill)
            const audioMissing =
              skill === 'listening' &&
              parts.some(section => !section.listening?.audio?.url)

            if (!parts.length) return null

            return (
              <ExamCard
                eyebrow={`${parts.length} phần`}
                key={skill}
                title={IELTS_SKILL_LABELS[skill]}
              >
                <ul className="grid gap-2">
                  {parts.map(section => (
                    <li
                      className="border-ex-line flex flex-wrap items-center justify-between gap-2 border-b pb-2"
                      key={section.key}
                    >
                      <span className="min-w-0 font-semibold">
                        <strong className="font-sans font-bold">
                          {partLabel(section)}
                        </strong>{' '}
                        · {partMinutes(section)}
                      </span>
                      <span className="flex gap-1.5">
                        <ExamButton
                          className="min-h-9 px-2.5 text-xs"
                          href={`/ielts/${slug}/${skill}?part=${section.order}`}
                          tone="paper"
                        >
                          Practice
                        </ExamButton>
                        {skill === 'listening' &&
                        !section.listening?.audio?.url ? null : (
                          <ExamButton
                            className="min-h-9 px-2.5 text-xs"
                            href={`/ielts/${slug}/${skill}/mock?part=${section.order}`}
                            tone="paper"
                          >
                            Mock
                          </ExamButton>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <ExamButton
                    href={`/ielts/${slug}/${skill}`}
                    tone="paper"
                  >
                    Practice cả bài
                  </ExamButton>
                  {audioMissing ? (
                    <span className="text-ex-muted self-center text-sm font-semibold">
                      Mock cần audio cho mọi part.
                    </span>
                  ) : (
                    <ExamButton
                      href={`/ielts/${slug}/${skill}/mock`}
                      tone="ink"
                    >
                      Mock{' '}
                      {skill === 'listening'
                        ? ''
                        : `${(skill === 'reading' ? IELTS_TIMERS.readingSkill : IELTS_TIMERS.writingSkill) / 60} phút`}
                    </ExamButton>
                  )}
                </div>
                {last ? (
                  <p className="text-sm">
                    Lần gần nhất:{' '}
                    <Link
                      className="font-bold underline"
                      href={`/ielts/attempts/${last.id}`}
                    >
                      {last.band !== null
                        ? `Band ${last.band.toFixed(1)}`
                        : last.raw !== null
                          ? `${last.raw}/${last.total}`
                          : 'Xem kết quả'}
                    </Link>
                  </p>
                ) : null}
              </ExamCard>
            )
          })}
        </div>
      </ExamSheet>
    </MangaPageShell>
  )
}
