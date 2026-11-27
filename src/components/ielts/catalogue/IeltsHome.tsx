import { GraduationCap, Settings } from 'lucide-react'

import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'

import { Progress } from '@/components/ui/progress'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import type { IeltsHomeData } from '@/modules/ielts/services/ieltsPageData'

import { AttemptHistory } from './AttemptHistory'
import { DrillButton } from './DrillButton'
import { OverviewPanel } from './OverviewPanel'
import { TestCards } from './TestCards'
import { ExamButton, ExamCard, ExamSheet } from '@/components/ielts/ui'

/** Most-missed question types; hidden until there is enough data to rank. */
function WeaknessMap({
  t,
  weakness,
}: Pick<IeltsHomeData, 'weakness'> & { t: Messages['ielts'] }) {
  if (!weakness || weakness.weakest.length === 0) return null

  return (
    <section className="grid min-w-0 content-start gap-2">
      <h2 className="font-sans text-sm font-semibold">
        {t.home.weaknessHeading}
      </h2>
      {/* One line per type: name, accuracy bar, percent, drill. */}
      <ul className="grid gap-1.5">
        {weakness.weakest.map(row => {
          const percent = Math.round((row.accuracy ?? 0) * 100)

          return (
            <li
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
              key={`${row.skill}-${row.type}`}
            >
              <span className="min-w-0 flex-1 basis-56">
                <strong className="font-sans font-semibold">
                  {t.questionTypes[row.type]}
                </strong>{' '}
                <span className="text-muted-foreground">
                  · {IELTS_SKILL_LABELS[row.skill]} · {row.correct}/{row.total}
                </span>
              </span>
              <Progress
                aria-label={format(t.home.percentCorrect, { percent })}
                className="w-24"
                value={percent}
              />
              <span className="w-9 text-right font-sans font-semibold tabular-nums">
                {percent}%
              </span>
              <DrillButton
                compact
                skill={row.skill}
                type={row.type}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * The IELTS landing page, kept to one job: pick a test and a skill. A short
 * header with the band estimate, the test cards, then weak spots (once there
 * is data) and history. Unfinished attempts are not surfaced here.
 */
export async function IeltsHome({
  attempts,
  catalog,
  error,
  isAdmin,
  overall,
  testBands,
  weakness,
}: IeltsHomeData) {
  const messages = await getMessages()
  const t = messages.ielts
  const hasProgress =
    Boolean(weakness?.weakest.length) ||
    attempts.some(attempt => attempt.status !== 'in_progress')

  return (
    <ExamSheet>
      <PageHeader
        actions={
          <>
            {overall ? (
              <div
                className="border-line bg-surface flex items-center gap-2.5 rounded-full border py-1 pr-4 pl-1"
                title={plural(t.home.bandEstimate, overall.skills.length)}
              >
                <ProgressRing
                  percent={(overall.band / 9) * 100}
                  ringClassName="text-accent-orange"
                  size={40}
                >
                  <span className="text-[11px]">{overall.band.toFixed(1)}</span>
                </ProgressRing>
                <span className="text-ink-soft text-sm">{t.home.band}</span>
              </div>
            ) : null}
            {isAdmin ? (
              <ExamButton
                href="/admin/ielts"
                icon={
                  <Settings
                    aria-hidden="true"
                    className="size-4"
                  />
                }
                tone="paper"
              >
                {t.home.manage}
              </ExamButton>
            ) : null}
          </>
        }
        icon={<GraduationCap />}
        iconClassName="bg-pastel-peach text-accent-orange"
        subtitle={t.home.intro}
        title={messages.common.modules.ielts.title}
      />

      {/* Weak spots and recent attempts fold away under one line. */}
      {hasProgress ? (
        <section className="bg-pastel-peach/60 rounded-panel p-3 sm:p-4">
          <OverviewPanel
            actions={null}
            heading={
              <h2 className="font-sans text-sm font-medium">
                {t.home.overviewTitle}
              </h2>
            }
          >
            <div className="border-line/40 mt-3 grid gap-x-6 gap-y-4 border-t pt-3 xl:grid-cols-2">
              <WeaknessMap
                t={t}
                weakness={weakness}
              />
              <AttemptHistory attempts={attempts} />
            </div>
          </OverviewPanel>
        </section>
      ) : null}

      {error ? (
        <ExamCard title={t.home.loadFailedTitle}>
          <p>{t.home[error]}</p>
          <ExamButton
            href="/ielts"
            tone="ink"
          >
            {messages.common.actions.retry}
          </ExamButton>
        </ExamCard>
      ) : catalog.length ? (
        <TestCards
          bands={testBands}
          catalog={catalog}
        />
      ) : (
        <ExamCard title={t.home.noTestsTitle}>
          <p>{isAdmin ? t.home.createFirst : t.home.newTestsAppear}</p>
          {isAdmin ? (
            <ExamButton
              href="/admin/ielts"
              tone="ink"
            >
              {t.home.createTest}
            </ExamButton>
          ) : null}
        </ExamCard>
      )}

      <p className="text-ink-soft text-xs">{t.home.disclaimer}</p>
    </ExamSheet>
  )
}
