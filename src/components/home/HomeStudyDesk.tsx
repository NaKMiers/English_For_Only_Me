import {
  ArrowRight,
  BookA,
  Clock3,
  Headphones,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { Sparkline } from '@/components/common/Sparkline'
import { APP_MODULES } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import { cn } from '@/lib/utils'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

import { HomeBuddyCard } from './HomeBuddyCard'
import { HomeModuleTiles, MODULE_ICONS } from './HomeModuleTiles'

/** What the grammar path wants next, for the plan. */
export interface GrammarTodayRecord {
  nextTitle: string | null
  dueCount: number
}

interface Props {
  dictationStats?: DictationGlobalStatsRecord | null
  grammarToday?: GrammarTodayRecord | null
  /** Clock for the greeting date; injectable for tests. */
  now?: Date
  userName?: string | null
  vocabStats?: VocabStatsRecord | null
}

function minutes(durationMs: number) {
  return Math.max(0, Math.round(durationMs / 60000))
}

function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-line bg-surface min-w-0 rounded-[26px] border p-3',
        className
      )}
    >
      {children}
    </div>
  )
}

interface ProgressStat {
  detail: string
  href: string
  icon: LucideIcon
  label: string
  meta: string
  tint: string
  accent: string
  trend: number[]
  value: string
}

function ProgressTile({ stat }: { stat: ProgressStat }) {
  const Icon = stat.icon

  return (
    <Link
      href={stat.href}
      className={cn(
        'soft-press hover-lift grid min-w-0 gap-3 rounded-[20px] p-4',
        stat.tint
      )}
    >
      <span className="flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <Icon
            aria-hidden="true"
            className="size-4 shrink-0"
          />
          <span className="truncate">{stat.label}</span>
        </span>
        <span className="bg-surface/70 text-ink-soft rounded-full px-2 py-0.5 text-xs">
          {stat.meta}
        </span>
      </span>
      <span className="flex items-end justify-between gap-2">
        <strong
          className={cn(
            'font-sans text-3xl leading-none font-light',
            stat.accent
          )}
        >
          {stat.value}
        </strong>
        <Sparkline
          values={stat.trend}
          className={stat.accent}
        />
      </span>
      <span className="text-ink-soft text-xs leading-5">{stat.detail}</span>
    </Link>
  )
}

interface PlanItem {
  hint: string
  href: string
  icon: LucideIcon
  label: string
  tone: string
}

function PlanGroup({
  count,
  items,
  tint,
  title,
}: {
  count: string
  items: PlanItem[]
  tint: string
  title: string
}) {
  return (
    <div className={cn('grid gap-3 rounded-[22px] p-3', tint)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="bg-surface/80 rounded-full px-3 py-1 font-medium">
          {title}
        </span>
        <span className="text-ink-soft">{count}</span>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {items.map(item => {
          const Icon = item.icon

          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className="soft-press hover:bg-surface/60 grid justify-items-center gap-1.5 rounded-2xl px-1 py-2 text-center"
              >
                <span
                  className={cn(
                    'bg-surface/80 grid size-12 place-items-center rounded-full',
                    item.tone
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-6"
                    strokeWidth={1.6}
                  />
                </span>
                <span className="text-sm leading-tight font-medium">
                  {item.label}
                </span>
                <span className="text-ink-soft text-[11px] leading-tight">
                  {item.hint}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ScheduleRow({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <li>
      <Link
        href={href}
        className="hover:bg-tint-soft flex min-h-12 items-center gap-3 rounded-2xl px-3 transition-colors"
      >
        <Icon
          aria-hidden="true"
          className="text-brand size-4 shrink-0"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {label}
        </span>
        <span className="text-ink-soft flex shrink-0 items-center gap-1.5 text-xs">
          <Clock3
            aria-hidden="true"
            className="size-3.5"
          />
          {value}
        </span>
      </Link>
    </li>
  )
}

export function HomeStudyDesk({
  dictationStats = null,
  grammarToday = null,
  now = new Date(),
  userName = null,
  vocabStats = null,
}: Props) {
  const firstName = userName?.trim().split(/\s+/)[0]
  const dueToday =
    (dictationStats?.dueReviewItemCount ?? 0) +
    (vocabStats?.dueTodayCount ?? 0) +
    (grammarToday?.dueCount ?? 0)
  const dateLabel = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  })
  const weeklyMinutes = minutes(dictationStats?.weeklyPracticeTimeMs ?? 0)
  const accuracyTrend =
    dictationStats?.firstTryAccuracyTrend.map(point => point.accuracy) ?? []
  const latestAccuracy = accuracyTrend.at(-1)

  const progress: ProgressStat[] = [
    {
      accent: 'text-accent-orange',
      detail: `${weeklyMinutes} min of listening this week, ${dictationStats?.completedVideoCount ?? 0} of ${dictationStats?.totalVideoCount ?? 0} saved videos done.`,
      href: '/dictation/stats',
      icon: Headphones,
      label: 'Dictation',
      meta: `${dictationStats?.activeStreakDays ?? 0} day streak`,
      tint: 'bg-pastel-peach',
      trend: accuracyTrend,
      value: latestAccuracy === undefined ? '0%' : `${latestAccuracy}%`,
    },
    {
      accent: 'text-accent-purple',
      detail: `${vocabStats?.totalKnownCount ?? 0} words known, ${vocabStats?.learnedTodayCount ?? 0} learned today.`,
      href: '/vocabulary',
      icon: BookA,
      label: 'Vocabulary',
      meta: `${vocabStats?.dueTodayCount ?? 0} due`,
      tint: 'bg-pastel-lilac',
      trend: vocabStats?.dailyGrowth.map(day => day.count) ?? [],
      value: `${vocabStats?.accuracyPercent ?? 0}%`,
    },
  ]

  const facts = {
    dictation: `${dictationStats?.totalVideoCount ?? 0} saved videos`,
    grammar: grammarToday?.nextTitle ?? 'A1 to C1 path',
    ielts: 'Listening, Reading, Writing',
    vocabulary: `${vocabStats?.totalKnownCount ?? 0} words known`,
  }

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/"
          title={firstName ? `Hello, ${firstName}` : 'English For Only Me'}
          subtitle={`${dateLabel} · ${dueToday} ${dueToday === 1 ? 'review' : 'reviews'} due today`}
          authControl={<AuthControl />}
        />
      }
    >
      <div className="grid gap-6 px-4 pb-6 md:pr-6 md:pl-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1
            id="home-title"
            className="font-sans text-4xl font-medium tracking-tight sm:text-5xl"
          >
            Dashboard
          </h1>
          <nav
            aria-label="Modules"
            className="flex flex-wrap gap-2"
          >
            {APP_MODULES.filter(module => module.status === 'active').map(
              module => {
                const Icon = MODULE_ICONS[module.key] ?? Sparkles
                const theme = MODULE_THEMES[module.key]

                return (
                  <Link
                    key={module.key}
                    href={module.href}
                    className={cn(
                      'soft-press bg-surface hover:bg-tint-soft inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-medium',
                      theme.outline,
                      theme.accent
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-4"
                    />
                    {module.shortTitle}
                  </Link>
                )
              }
            )}
          </nav>
        </div>

        <div className="motion-stagger grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
          {/* Column 1: progress, modules, counters */}
          <div className="grid min-w-0 content-start gap-5 md:col-span-2 xl:col-span-1">
            <Card className="grid gap-3">
              <Link
                href="/dictation/stats"
                className="hover:bg-tint-soft flex items-center justify-between gap-3 rounded-2xl px-2 py-1.5 transition-colors"
              >
                <span className="flex items-center gap-3 text-sm font-medium">
                  <span className="bg-pastel-sky text-accent-blue grid size-9 place-items-center rounded-full">
                    <Sparkles
                      aria-hidden="true"
                      className="size-4"
                    />
                  </span>
                  Learning progress
                </span>
                <span className="border-line grid size-9 place-items-center rounded-full border">
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4"
                  />
                </span>
              </Link>
              <div className="grid gap-3 sm:grid-cols-2">
                {progress.map(stat => (
                  <ProgressTile
                    key={stat.label}
                    stat={stat}
                  />
                ))}
              </div>
            </Card>

            <HomeModuleTiles facts={facts} />

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <Card className="bg-pastel-sky/60 grid content-start gap-3 p-4">
                <span className="text-sm font-medium">Weak words</span>
                {dictationStats?.weakWords.length ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {dictationStats.weakWords.slice(0, 6).map(word => (
                      <li
                        key={word.word}
                        className="bg-surface rounded-full px-2.5 py-1 text-xs font-medium"
                      >
                        {word.word}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-ink-soft text-xs leading-5">
                    Words you miss in dictation collect here.
                  </p>
                )}
              </Card>
              <Card className="grid grid-cols-3 items-center p-4 text-center">
                {[
                  {
                    label: 'Videos',
                    value: dictationStats?.completedVideoCount ?? 0,
                  },
                  {
                    label: 'Streak',
                    value: Math.max(
                      dictationStats?.activeStreakDays ?? 0,
                      vocabStats?.activeStreakDays ?? 0
                    ),
                  },
                  {
                    label: 'Words',
                    value: vocabStats?.totalKnownCount ?? 0,
                  },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className={cn(
                      'grid gap-1',
                      index > 0 && 'border-line border-l'
                    )}
                  >
                    <span className="text-ink-soft text-xs">{item.label}</span>
                    <strong className="font-sans text-2xl font-medium">
                      {item.value}
                    </strong>
                  </div>
                ))}
              </Card>
            </div>
          </div>

          {/* Column 2: today's plan and schedule */}
          <div className="grid min-w-0 content-start gap-4">
            <h2 className="font-sans text-xl leading-snug font-medium tracking-tight">
              Your study plan for today{' '}
              <span className="marker text-brand">made for you</span>
            </h2>
            <PlanGroup
              title="Listen"
              count={`${weeklyMinutes} min this week`}
              tint="bg-pastel-sky/70"
              items={[
                {
                  hint: `${dictationStats?.totalVideoCount ?? 0} videos`,
                  href: '/dictation',
                  icon: Headphones,
                  label: 'Dictation',
                  tone: 'text-accent-blue',
                },
                {
                  hint: `${dictationStats?.weakWords.length ?? 0} words`,
                  href: '/dictation/review',
                  icon: RotateCcw,
                  label: 'Weak words',
                  tone: 'text-accent-orange',
                },
                {
                  hint: 'Add one',
                  href: '/dictation',
                  icon: Plus,
                  label: 'New clip',
                  tone: 'text-ink-soft',
                },
              ]}
            />
            <PlanGroup
              title="Read and write"
              count={`${grammarToday?.dueCount ?? 0} to review`}
              tint="bg-pastel-rose/70"
              items={[
                {
                  hint: `${vocabStats?.dueTodayCount ?? 0} due`,
                  href: '/vocabulary',
                  icon: BookA,
                  label: 'Words',
                  tone: 'text-accent-pink',
                },
                {
                  hint: grammarToday?.nextTitle ? 'Next lesson' : 'Start',
                  href: '/grammar',
                  icon: PenLine,
                  label: 'Grammar',
                  tone: 'text-accent-purple',
                },
                {
                  hint: 'Full tests',
                  href: '/ielts',
                  icon: MODULE_ICONS.ielts ?? Sparkles,
                  label: 'IELTS',
                  tone: 'text-accent-orange',
                },
              ]}
            />
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-lg font-medium">Schedule</h2>
                <Link
                  href="/dictation/review"
                  aria-label="Open the review queue"
                  className="soft-press bg-pastel-lemon grid size-10 place-items-center rounded-full"
                >
                  <Plus
                    aria-hidden="true"
                    className="size-4"
                  />
                </Link>
              </div>
              <Card className="p-1.5">
                <ul className="grid">
                  <ScheduleRow
                    href="/dictation/review"
                    icon={RotateCcw}
                    label="Dictation review"
                    value={`${dictationStats?.dueReviewItemCount ?? 0} due`}
                  />
                  <ScheduleRow
                    href="/vocabulary"
                    icon={BookA}
                    label="Vocabulary recall"
                    value={`${vocabStats?.dueTodayCount ?? 0} due`}
                  />
                  <ScheduleRow
                    href="/grammar"
                    icon={PenLine}
                    label="Grammar review"
                    value={`${grammarToday?.dueCount ?? 0} due`}
                  />
                </ul>
              </Card>
            </div>
          </div>

          {/* Column 3: the highlight card */}
          <HomeBuddyCard
            completedVideoCount={dictationStats?.completedVideoCount ?? 0}
            monthlyMinutes={minutes(dictationStats?.monthlyPracticeTimeMs ?? 0)}
            nextGrammarTitle={grammarToday?.nextTitle ?? null}
            streakDays={Math.max(
              dictationStats?.activeStreakDays ?? 0,
              vocabStats?.activeStreakDays ?? 0
            )}
          />
        </div>
      </div>
    </PageShell>
  )
}
