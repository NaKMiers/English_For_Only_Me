import {
  BookA,
  Headphones,
  PenLine,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { Sparkline } from '@/components/common/Sparkline'
import { MODULE_ICONS } from '@/constants/modules'
import { DUE_ICON } from '@/constants/stateIcons'
import { MODULE_THEMES } from '@/constants/theme'
import { DEFAULT_LOCALE, INTL_LOCALES, type Locale } from '@/i18n/config'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { en } from '@/i18n/messages/en'
import { cn } from '@/lib/utils'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

import { HomeBuddyCard } from './HomeBuddyCard'
import { HomeModuleNav } from './HomeModuleNav'
import { HomeModuleTiles } from './HomeModuleTiles'
import { HomeSimpleView } from './HomeSimpleView'
import { HomeViewSwitch } from './HomeViewSwitch'
import { pickBuddyMood } from './buddyMood'
import { DEFAULT_HOME_VIEW, type HomeView } from './homeView'

/** What the grammar path wants next, for the plan. */
export interface GrammarTodayRecord {
  /** The path's next step page (`nextHref(PathNext)`), null when done. */
  nextHref?: string | null
  nextTitle: string | null
  dueCount: number
}

interface Props {
  dictationStats?: DictationGlobalStatsRecord | null
  grammarToday?: GrammarTodayRecord | null
  /** UI language; the page passes the learner's, tests use English. */
  locale?: Locale
  messages?: Messages
  /** Clock for the greeting date; injectable for tests. */
  now?: Date
  userName?: string | null
  /** Simple or full dashboard; the page reads the learner's cookie. */
  view?: HomeView
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
        'border-line bg-surface rounded-panel min-w-0 border p-3',
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
        'soft-press hover-pop rounded-panel grid min-w-0 gap-3 p-4',
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
        <span className="bg-surface text-ink-soft rounded-full px-2 py-0.5 text-xs">
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
    <div className={cn('rounded-panel grid gap-3 p-3', tint)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="bg-surface rounded-full px-3 py-1 font-medium">
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
                className="soft-press hover-pop hover:bg-surface rounded-control grid justify-items-center gap-1.5 px-1 py-2 text-center"
              >
                <span
                  className={cn(
                    'bg-surface grid size-12 place-items-center rounded-full',
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
                <span className="text-ink-soft text-xs leading-tight">
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

export function HomeStudyDesk({
  dictationStats = null,
  grammarToday = null,
  locale = DEFAULT_LOCALE,
  messages = en,
  now = new Date(),
  userName = null,
  view = DEFAULT_HOME_VIEW,
  vocabStats = null,
}: Props) {
  const t = messages.home
  const firstName = userName?.trim().split(/\s+/)[0]
  const dueToday =
    (dictationStats?.dueReviewItemCount ?? 0) +
    (vocabStats?.dueTodayCount ?? 0) +
    (grammarToday?.dueCount ?? 0)
  const dateLabel = now.toLocaleDateString(INTL_LOCALES[locale], {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  })
  const weeklyMinutes = minutes(dictationStats?.weeklyPracticeTimeMs ?? 0)
  const accuracyTrend =
    dictationStats?.firstTryAccuracyTrend.map(point => point.accuracy) ?? []
  const latestAccuracy = accuracyTrend.at(-1)
  const streakDays = Math.max(
    dictationStats?.activeStreakDays ?? 0,
    vocabStats?.activeStreakDays ?? 0
  )
  const hasStats = Boolean(dictationStats || vocabStats || grammarToday)
  const mood = pickBuddyMood({
    hasStats,
    learnedToday: vocabStats?.learnedTodayCount ?? 0,
    streakDays,
    totalDue: dueToday,
    weeklyMinutes,
  })
  const buddy = (variant: 'full' | 'simple') => (
    <HomeBuddyCard
      completedVideoCount={dictationStats?.completedVideoCount ?? 0}
      messages={messages}
      monthlyMinutes={minutes(dictationStats?.monthlyPracticeTimeMs ?? 0)}
      mood={mood}
      nextGrammarTitle={grammarToday?.nextTitle ?? null}
      streakDays={streakDays}
      totalDue={dueToday}
      variant={variant}
    />
  )

  const progress: ProgressStat[] = [
    {
      accent: MODULE_THEMES.dictation.accent,
      detail: format(t.progress.dictationDetail, {
        done: dictationStats?.completedVideoCount ?? 0,
        minutes: weeklyMinutes,
        total: dictationStats?.totalVideoCount ?? 0,
      }),
      href: '/dictation',
      icon: Headphones,
      label: t.progress.dictation,
      meta: format(t.progress.streak, {
        count: dictationStats?.activeStreakDays ?? 0,
      }),
      tint: MODULE_THEMES.dictation.tint,
      trend: accuracyTrend,
      value: latestAccuracy === undefined ? '0%' : `${latestAccuracy}%`,
    },
    {
      accent: 'text-accent-green',
      detail: format(t.progress.vocabularyDetail, {
        known: vocabStats?.totalKnownCount ?? 0,
        today: vocabStats?.learnedTodayCount ?? 0,
      }),
      href: '/vocabulary',
      icon: BookA,
      label: t.progress.vocabulary,
      meta: format(t.progress.due, { count: vocabStats?.dueTodayCount ?? 0 }),
      tint: 'bg-pastel-mint',
      trend: vocabStats?.dailyGrowth.map(day => day.count) ?? [],
      value: `${vocabStats?.accuracyPercent ?? 0}%`,
    },
  ]

  const facts = {
    dictation: format(t.facts.savedVideos, {
      count: dictationStats?.totalVideoCount ?? 0,
    }),
    grammar: grammarToday?.nextTitle ?? t.facts.grammarPath,
    ielts: t.facts.ielts,
    vocabulary: format(t.facts.wordsKnown, {
      count: vocabStats?.totalKnownCount ?? 0,
    }),
  }

  return (
    <PageShell
      topbar={
        <AppTopbar
          showAccount
          activeHref="/"
          title={
            firstName
              ? format(t.greeting, { name: firstName })
              : messages.common.app.name
          }
          subtitle={plural(t.dueToday, dueToday, { date: dateLabel })}
        />
      }
    >
      <div className="grid gap-6 px-4 pb-6 md:pr-6 md:pl-0">
        <HomeViewSwitch
          initialView={view}
          labels={{
            full: t.view.full,
            simple: t.view.simple,
            switchToFull: t.view.switchToFull,
            switchToSimple: t.view.switchToSimple,
            title: t.dashboard,
          }}
          nav={<HomeModuleNav messages={messages} />}
          simple={
            <HomeSimpleView
              accuracyPercent={latestAccuracy ?? null}
              buddy={buddy('simple')}
              dictationDue={dictationStats?.dueReviewItemCount ?? 0}
              grammarDue={grammarToday?.dueCount ?? 0}
              messages={messages}
              nextGrammarHref={grammarToday?.nextHref ?? null}
              nextGrammarTitle={grammarToday?.nextTitle ?? null}
              vocabularyDue={vocabStats?.dueTodayCount ?? 0}
              weeklyMinutes={weeklyMinutes}
              wordsKnown={vocabStats?.totalKnownCount ?? 0}
            />
          }
          full={
            <div className="motion-stagger grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
              {/* Column 1: progress, modules, weak words */}
              <div className="grid min-w-0 content-start gap-5 md:col-span-2 xl:col-span-1">
                <Card className="grid gap-3">
                  {/* A heading, not a link: the two tiles below already
                      link to their modules. */}
                  <h2 className="flex items-center gap-3 px-2 py-1.5 text-sm font-medium">
                    <span className="bg-pastel-sky text-accent-blue grid size-9 place-items-center rounded-full">
                      <Sparkles
                        aria-hidden="true"
                        className="size-4"
                      />
                    </span>
                    {t.learningProgress}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {progress.map(stat => (
                      <ProgressTile
                        key={stat.label}
                        stat={stat}
                      />
                    ))}
                  </div>
                </Card>

                <HomeModuleTiles
                  facts={facts}
                  messages={messages}
                />

                <Card className="bg-pastel-sky grid content-start gap-3 p-4">
                  <span className="text-sm font-medium">{t.weakWords}</span>
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
                      {t.weakWordsEmpty}
                    </p>
                  )}
                </Card>
              </div>

              {/* Column 2: today's plan (with what is due) */}
              <div className="grid min-w-0 content-start gap-4">
                <h2 className="font-sans text-xl leading-snug font-medium tracking-tight">
                  {t.plan.title}{' '}
                  <span className="marker text-brand">{t.plan.madeForYou}</span>
                </h2>
                <PlanGroup
                  title={t.plan.listen}
                  count={format(t.plan.minutesThisWeek, {
                    count: weeklyMinutes,
                  })}
                  tint="bg-pastel-sky"
                  items={[
                    {
                      hint: format(t.plan.videos, {
                        count: dictationStats?.totalVideoCount ?? 0,
                      }),
                      href: '/dictation',
                      icon: Headphones,
                      label: t.plan.dictation,
                      tone: 'text-accent-blue',
                    },
                    {
                      hint: format(t.plan.due, {
                        count: dictationStats?.dueReviewItemCount ?? 0,
                      }),
                      href: '/dictation/review',
                      icon: DUE_ICON,
                      label: t.plan.weakWords,
                      tone: 'text-accent-orange',
                    },
                  ]}
                />
                <PlanGroup
                  title={t.plan.readWrite}
                  count={format(t.plan.toReview, {
                    count: grammarToday?.dueCount ?? 0,
                  })}
                  // Mixed modules: a neutral fill (no module wears pink).
                  tint="bg-tint"
                  items={[
                    {
                      hint: format(t.plan.due, {
                        count: vocabStats?.dueTodayCount ?? 0,
                      }),
                      href: '/vocabulary',
                      icon: BookA,
                      label: t.plan.vocabulary,
                      tone: 'text-accent-green',
                    },
                    {
                      hint: grammarToday?.dueCount
                        ? format(t.plan.due, { count: grammarToday.dueCount })
                        : grammarToday?.nextTitle
                          ? t.plan.nextLesson
                          : t.plan.start,
                      href: '/grammar',
                      icon: PenLine,
                      label: t.plan.grammar,
                      tone: 'text-accent-purple',
                    },
                    {
                      hint: t.plan.fullTests,
                      href: '/ielts',
                      icon: MODULE_ICONS.ielts ?? Sparkles,
                      label: t.plan.ielts,
                      tone: 'text-accent-orange',
                    },
                  ]}
                />
              </div>

              {/* Column 3: the highlight card */}
              {buddy('full')}
            </div>
          }
        />
      </div>
    </PageShell>
  )
}
