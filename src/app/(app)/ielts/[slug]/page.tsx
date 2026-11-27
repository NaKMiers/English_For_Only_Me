import type { Metadata } from 'next'
import { PenLine } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { hasGoogleAuth, hasMongoDbUri } from '@/constants/environments'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { auth } from '@/lib/auth/auth'
import { connectDatabase, connectDatabaseWhen } from '@/lib/db/connectDatabase'
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
import { listIeltsTestVocabForLearner } from '@/modules/ielts/vocab/testVocabService'
import { SkillLauncher } from '@/components/ielts/catalogue/SkillLauncher'
import { TestVocabPanel } from '@/components/ielts/catalogue/TestVocabPanel'
import {
  ExamBadge,
  ExamHero,
  ExamIconButton,
  ExamSheet,
} from '@/components/ielts/ui'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ slug }, t] = await Promise.all([params, getMessages()])

  return { title: format(t.ielts.meta.testTitle, { slug }) }
}

type IeltsText = Messages['ielts']

function partMinutes(t: IeltsText, section: IeltsSection) {
  if (section.skill === 'listening') {
    const seconds = section.listening?.audio?.durationSec ?? 0

    return seconds
      ? format(t.testPage.audioMinutes, { minutes: Math.ceil(seconds / 60) })
      : t.testPage.noAudio
  }

  const seconds =
    section.skill === 'reading'
      ? IELTS_TIMERS.readingPart
      : section.writing?.task === 1
        ? IELTS_TIMERS.writingTask1
        : IELTS_TIMERS.writingTask2

  return format(t.testPage.minutes, { minutes: seconds / 60 })
}

function partLabel(t: IeltsText, section: IeltsSection) {
  if (section.skill === 'writing')
    return format(t.parts.task, {
      part: section.writing?.task ?? section.order,
    })

  return format(
    section.skill === 'listening' ? t.parts.part : t.parts.passage,
    { part: section.order }
  )
}

function lastAttempt(attempts: IeltsAttemptSummary[], skill: IeltsSkill) {
  return attempts.find(
    attempt => attempt.skill === skill && attempt.status !== 'in_progress'
  )
}

export default async function IeltsTestPage({ params }: Props) {
  const [{ slug }, messages] = await Promise.all([params, getMessages()])
  const t = messages.ielts

  if (!hasMongoDbUri() || !/^[a-z0-9-]{1,80}$/.test(slug)) notFound()

  const actorId = await connectDatabaseWhen(getPracticeActorId())
  const [test, attempts, vocab, session] = await Promise.all([
    readPublishedIeltsTest(slug),
    actorId
      ? listIeltsAttempts(actorId, { testSlug: slug, limit: 20 })
      : Promise.resolve([]),
    // Guests without an id yet skip the connect above; the word list is not
    // cached, so it always needs the connection.
    connectDatabase().then(() =>
      listIeltsTestVocabForLearner({ slug, userId: actorId })
    ),
    hasGoogleAuth() ? auth() : null,
  ])

  if (!test) notFound()

  // Role comes from the server session (ADMIN_EMAILS), never the client.
  const isAdmin = session?.user?.role === 'admin'

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/ielts"
          authControl={<AuthControl />}
          subtitle={t.shell.subtitle}
        />
      }
    >
      <ExamSheet>
        {/* One line: breadcrumb, title, track and target, admin edit. */}
        <ExamHero className="gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <nav
              aria-label={t.shell.breadcrumb}
              className="text-muted-foreground text-sm font-semibold"
            >
              <Link
                className="hover:text-brand underline"
                href="/ielts"
              >
                IELTS
              </Link>{' '}
              /
            </nav>
            <h1 className="font-sans text-2xl leading-tight font-semibold wrap-break-word">
              {test.title}
            </h1>
            <ExamBadge tone="pale">{t.tracks[test.track]}</ExamBadge>
            <ExamBadge>
              {format(t.testPage.target, { band: test.targetBand })}
            </ExamBadge>
            {isAdmin ? (
              <ExamIconButton
                className="ml-auto size-9"
                href={`/admin/ielts/${test.id}`}
                label={t.testPage.editTest}
              >
                <PenLine
                  aria-hidden="true"
                  className="size-4"
                />
              </ExamIconButton>
            ) : null}
          </div>
          {test.description ? (
            <p className="max-w-2xl text-sm">{test.description}</p>
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
                  practice: format(t.testPage.allSections[skill], {
                    count: parts.length,
                  }),
                  mock:
                    skill === 'listening'
                      ? t.testPage.audioOnce
                      : format(t.testPage.minutes, {
                          minutes:
                            (skill === 'reading'
                              ? IELTS_TIMERS.readingSkill
                              : IELTS_TIMERS.writingSkill) / 60,
                        }),
                }}
                key={skill}
                latest={
                  last
                    ? {
                        href: `/ielts/attempts/${last.id}`,
                        label:
                          last.band !== null
                            ? format(t.testPage.latestBand, {
                                band: last.band.toFixed(1),
                              })
                            : last.raw !== null
                              ? `${last.raw}/${last.total}`
                              : t.testPage.view,
                      }
                    : null
                }
                mockBlockedReason={audioMissing ? t.testPage.mockBlocked : null}
                parts={parts.map(section => ({
                  label: partLabel(t, section),
                  meta: partMinutes(t, section),
                  part: section.order,
                }))}
                partsNoun={plural(t.testPage.sectionCount[skill], parts.length)}
                skill={skill}
                slug={slug}
                title={IELTS_SKILL_LABELS[skill]}
              />
            )
          })}
        </div>

        <TestVocabPanel entries={vocab} />
      </ExamSheet>
    </PageShell>
  )
}
