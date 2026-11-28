import { ArrowRight, GraduationCap, Target, TrendingUp } from 'lucide-react'
import Link from 'next/link'

import { NextStopCard } from '@/components/journey/NextStopCard'
import { SessionEnd } from '@/components/journey/SessionEnd'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import { bandsFromAttempts } from '@/modules/ielts/attempts/testBands'
import type { IeltsSkill } from '@/modules/ielts/constants'

import { nextSkillOf } from '../catalogue/testPath'

interface Props {
  attempt: {
    /** The attempt's band: `result.band`, or `writingBand` for writing. */
    band: number | null
    id: string
    result: { band: number | null; raw: number; total: number } | null
    skill: IeltsSkill
    testSlug: string
  }
  /** The learner's finished attempts on this test, newest first. */
  history: IeltsAttemptSummary[]
  messages: Messages
  /** The test's skills (from the published test), or null for a drill. */
  test: { id: string; skills: IeltsSkill[]; targetBand: number } | null
}

/**
 * The top of an IELTS result (peak-end rule): the band (or score), target
 * and change since the last attempt as chips, the step this result took
 * in its test, then one next stop: the test's next skill, or the landing
 * once the test is cleared.
 */
export function IeltsResultHead({ attempt, history, messages, test }: Props) {
  const t = messages.ielts.resultHead
  const band = attempt.band
  const previous = history.find(
    item =>
      item.id !== attempt.id &&
      item.skill === attempt.skill &&
      item.status !== 'in_progress' &&
      item.band !== null
  )
  const delta =
    band !== null && previous?.band != null ? band - previous.band : null
  const entry = test
    ? { id: test.id, skills: test.skills.map(skill => ({ skill })) }
    : null
  const bands = entry ? bandsFromAttempts(entry.id, history) : {}
  const banded = entry
    ? entry.skills.filter(({ skill }) => bands[entry.id]?.[skill] !== undefined)
        .length
    : 0
  const firstBandForSkill =
    band !== null &&
    !history.some(
      item =>
        item.id !== attempt.id &&
        item.skill === attempt.skill &&
        item.status !== 'in_progress' &&
        item.band !== null
    )
  const next = entry ? nextSkillOf(entry, bands) : null
  const skill = (key: IeltsSkill) => messages.ielts.skills[key]

  return (
    <SessionEnd
      headline={{
        icon: <GraduationCap />,
        unit: band !== null ? skill(attempt.skill) : undefined,
        value:
          band !== null
            ? band.toFixed(1)
            : attempt.result
              ? `${attempt.result.raw}/${attempt.result.total}`
              : '-',
      }}
      journeyStep={
        entry
          ? format(firstBandForSkill ? t.stepTaken : t.banded, {
              done: banded,
              total: entry.skills.length,
            })
          : null
      }
      module="ielts"
      nextStop={
        <NextStopCard
          actionIcon={<ArrowRight aria-hidden="true" />}
          actionLabel={
            next ? format(t.start, { skill: skill(next) }) : t.allTests
          }
          detail={next ? t.nextSkill : t.testCleared}
          href={next ? `/ielts/${attempt.testSlug}/${next}` : '/ielts'}
          pinLabel={messages.common.journey.nextStop}
          title={next ? skill(next) : messages.common.modules.ielts.title}
          variant="compact"
        />
      }
      secondary={
        attempt.testSlug ? (
          <Link
            className="soft-press hover-pop text-ink-soft hover:text-ink rounded-control inline-flex min-h-11 items-center px-3 text-sm font-medium"
            href={`/ielts/${attempt.testSlug}`}
          >
            {messages.ielts.result.backToTest}
          </Link>
        ) : null
      }
      // The page title already says "Listening result": the end says the win.
      title={format(messages.ielts.result.done, {
        skill: skill(attempt.skill),
      })}
      titleId="ielts-result-head"
      stats={
        <StatStrip>
          {band !== null && attempt.result ? (
            <StatChip
              icon={GraduationCap}
              label={messages.ielts.result.score}
              tone="ielts"
              value={`${attempt.result.raw}/${attempt.result.total}`}
            />
          ) : null}
          {test ? (
            <StatChip
              icon={Target}
              label={t.target}
              tone="ielts"
              value={test.targetBand.toFixed(1)}
            />
          ) : null}
          {delta !== null ? (
            <StatChip
              icon={TrendingUp}
              label={t.delta}
              tone="ielts"
              value={`${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`}
            />
          ) : null}
        </StatStrip>
      }
    />
  )
}
