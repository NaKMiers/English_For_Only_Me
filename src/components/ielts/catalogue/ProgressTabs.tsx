'use client'

import { History, Target } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { useLocale, useMessages } from '@/i18n/client'
import { INTL_LOCALES } from '@/i18n/config'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import type { IeltsWeaknessStats } from '@/modules/ielts/stats/weaknessStats'

import { DeleteAttemptButton } from './DeleteAttemptButton'
import { DrillButton } from './DrillButton'
import { SKILL_ICONS } from './SkillPips'

interface Props {
  attempts: IeltsAttemptSummary[]
  className?: string
  weakness: IeltsWeaknessStats | null
}

type Tab = 'weak' | 'recent'

/**
 * The small card beside the journey: recent attempts and weak spots behind
 * two tabs, each a short list that scrolls inside the card. Recent attempts
 * come first and open by default.
 */
export function ProgressTabs({ attempts, className, weakness }: Props) {
  const messages = useMessages()
  const t = messages.ielts
  const locale = useLocale()
  const weak = weakness?.weakest ?? []
  const finished = attempts.filter(attempt => attempt.status !== 'in_progress')
  const [tab, setTab] = useState<Tab>('recent')
  const dateFormat = new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    day: '2-digit',
    month: '2-digit',
  })
  const tabs: {
    count: number
    icon: typeof Target
    key: Tab
    label: string
  }[] = [
    {
      count: finished.length,
      icon: History,
      key: 'recent',
      label: t.journey.progress.recent,
    },
    {
      count: weak.length,
      icon: Target,
      key: 'weak',
      label: t.journey.progress.weak,
    },
  ]

  return (
    <section
      aria-label={t.journey.progress.title}
      className={cn(
        'border-line bg-surface rounded-panel flex min-h-0 min-w-0 flex-col gap-3 border p-3 sm:p-4',
        className
      )}
    >
      {/* Segmented tabs. */}
      <div
        className="bg-surface-muted flex gap-1 rounded-full p-1"
        role="tablist"
      >
        {tabs.map(item => {
          const Icon = item.icon
          const active = tab === item.key

          return (
            <button
              aria-controls={`ielts-progress-${item.key}`}
              aria-selected={active}
              className={cn(
                'soft-press flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium',
                active
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-soft hover:text-ink hover-pop'
              )}
              id={`ielts-progress-tab-${item.key}`}
              key={item.key}
              onClick={() => setTab(item.key)}
              role="tab"
              type="button"
            >
              <Icon
                aria-hidden="true"
                className="size-4"
              />
              {item.label}
              <span className="text-ink-soft text-xs tabular-nums">
                {item.count}
              </span>
            </button>
          )
        })}
      </div>

      <div
        aria-labelledby={`ielts-progress-tab-${tab}`}
        className="max-h-64 min-h-0 flex-1 overflow-y-auto overscroll-contain lg:max-h-none"
        id={`ielts-progress-${tab}`}
        role="tabpanel"
      >
        {tab === 'weak' ? (
          weak.length > 0 ? (
            <ul className="grid gap-1">
              {weak.map(row => {
                const percent = Math.round((row.accuracy ?? 0) * 100)
                const Icon = SKILL_ICONS[row.skill]

                return (
                  // A static row: only its Drill button is clickable.
                  <li
                    className="rounded-control flex items-center gap-2.5 px-2 py-1.5"
                    key={`${row.skill}-${row.type}`}
                  >
                    <Icon
                      aria-label={IELTS_SKILL_LABELS[row.skill]}
                      className="text-ink-soft size-4 shrink-0"
                    />
                    <span className="grid min-w-0 flex-1 gap-1">
                      <span className="truncate text-sm font-medium">
                        {t.questionTypes[row.type]}
                      </span>
                      <span
                        aria-label={format(t.home.percentCorrect, {
                          percent,
                        })}
                        className="bg-tint h-1.5 overflow-hidden rounded-full"
                        role="img"
                      >
                        <span
                          className={cn(
                            'block h-full rounded-full',
                            percent < 50 ? 'bg-brand' : 'bg-accent-orange'
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                    </span>
                    <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums">
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
          ) : (
            <p className="text-ink-soft p-2 text-sm">
              {finished.length > 0
                ? t.journey.progress.emptyWeak
                : t.journey.progress.empty}
            </p>
          )
        ) : finished.length > 0 ? (
          <ul className="grid gap-1">
            {finished.map(attempt => {
              const Icon = SKILL_ICONS[attempt.skill]
              const name =
                attempt.testTitle || attempt.testSlug || t.history.drill

              return (
                // The row itself is static; the attempt link (with the row's
                // padding) is what lights up.
                <li
                  className="flex items-center gap-1.5 pl-2"
                  key={attempt.id}
                >
                  <Icon
                    aria-label={IELTS_SKILL_LABELS[attempt.skill]}
                    className="text-ink-soft size-4 shrink-0"
                  />
                  <Link
                    className="soft-press hover-pop hover:bg-tint-soft rounded-control grid min-h-11 min-w-0 flex-1 content-center px-1.5 py-1.5 leading-tight"
                    href={`/ielts/attempts/${attempt.id}`}
                  >
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span className="text-ink-soft truncate text-xs">
                      {dateFormat.format(new Date(attempt.startedAt))} ·{' '}
                      {attempt.part
                        ? `${format(t.history.partShort, { part: attempt.part })} · `
                        : ''}
                      {t.modes[attempt.mode]}
                      {attempt.raw !== null
                        ? ` · ${attempt.raw}/${attempt.total}`
                        : ''}
                    </span>
                  </Link>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 font-sans text-xs font-semibold tabular-nums',
                      attempt.band === null
                        ? 'text-ink-soft'
                        : 'bg-pastel-peach text-accent-orange'
                    )}
                  >
                    {attempt.band === null
                      ? t.statuses[attempt.status]
                      : attempt.band.toFixed(1)}
                  </span>
                  <DeleteAttemptButton
                    attemptId={attempt.id}
                    label={`${name} · ${IELTS_SKILL_LABELS[attempt.skill]}`}
                  />
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-ink-soft p-2 text-sm">
            {t.journey.progress.emptyRecent}
          </p>
        )}
      </div>
    </section>
  )
}
