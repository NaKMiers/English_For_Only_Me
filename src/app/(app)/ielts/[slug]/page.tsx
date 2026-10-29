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
import { SkillLauncher } from '@/components/ielts/catalogue/SkillLauncher'
import { ExamBadge, ExamSheet, ExamHero } from '@/components/ielts/ui'

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

    return seconds ? `${Math.ceil(seconds / 60)} min audio` : 'no audio yet'
  }

  if (section.skill === 'reading') return `${IELTS_TIMERS.readingPart / 60} min`

  return section.writing?.task === 1
    ? `${IELTS_TIMERS.writingTask1 / 60} min`
    : `${IELTS_TIMERS.writingTask2 / 60} min`
}

const SECTION_NOUNS: Record<IeltsSkill, string> = {
  listening: 'part',
  reading: 'passage',
  writing: 'task',
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
            </Link>{' '}
            / {test.title}
          </nav>
          <div className="flex flex-wrap gap-2">
            <ExamBadge tone="pale">
              {test.track === 'general' ? 'General Training' : 'Academic'}
            </ExamBadge>
            <ExamBadge>Target {test.targetBand}</ExamBadge>
          </div>
          <h1 className="font-sans text-3xl leading-tight font-black wrap-break-word sm:text-4xl">
            {test.title}
          </h1>
          {test.description ? (
            <p className="max-w-2xl">{test.description}</p>
          ) : null}
        </ExamHero>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <SkillLauncher
                fullMeta={{
                  practice: `All ${parts.length} ${SECTION_NOUNS[skill]}s`,
                  mock:
                    skill === 'listening'
                      ? 'Audio plays once'
                      : `${(skill === 'reading' ? IELTS_TIMERS.readingSkill : IELTS_TIMERS.writingSkill) / 60} min`,
                }}
                key={skill}
                latest={
                  last
                    ? {
                        href: `/ielts/attempts/${last.id}`,
                        label:
                          last.band !== null
                            ? `Band ${last.band.toFixed(1)}`
                            : last.raw !== null
                              ? `${last.raw}/${last.total}`
                              : 'View',
                      }
                    : null
                }
                mockBlockedReason={
                  audioMissing
                    ? 'The mock test opens once every part has audio.'
                    : null
                }
                parts={parts.map(section => ({
                  label: partLabel(section),
                  meta: partMinutes(section),
                  part: section.order,
                }))}
                partsNoun={`${parts.length} ${SECTION_NOUNS[skill]}${parts.length === 1 ? '' : 's'}`}
                skill={skill}
                slug={slug}
                title={IELTS_SKILL_LABELS[skill]}
              />
            )
          })}
        </div>
      </ExamSheet>
    </MangaPageShell>
  )
}
