import { Clock3, Flame, ListChecks, Trophy } from 'lucide-react'
import Link from 'next/link'

import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'

import { HomeBuddyMascot } from './HomeBuddyMascot'
import { BUDDY_MOOD_STYLES, type BuddyMood } from './buddyMood'

interface Props {
  completedVideoCount: number
  messages: Messages
  monthlyMinutes: number
  mood: BuddyMood
  nextGrammarTitle: string | null
  streakDays: number
  totalDue: number
  /** `simple` drops the two counters at the bottom. */
  variant?: 'full' | 'simple'
}

/**
 * The big highlight card: the mascot from the logo, whose face and colours
 * follow the learner's progress (see buddyMood.ts), what to study next and
 * the streak. Shown in both dashboard views.
 */
export function HomeBuddyCard({
  completedVideoCount,
  messages,
  monthlyMinutes,
  mood,
  nextGrammarTitle,
  streakDays,
  totalDue,
  variant = 'full',
}: Props) {
  const t = messages.home.buddy
  const moodText = t.moods[mood]
  const moodStyle = BUDDY_MOOD_STYLES[mood]

  return (
    <section
      aria-labelledby="home-buddy-title"
      className={cn(
        'border-line via-pastel-cream to-surface rounded-panel relative grid content-between gap-5 overflow-hidden border bg-linear-170 via-55% p-5 transition-colors duration-500',
        moodStyle.glow,
        variant === 'full' ? 'min-h-[560px]' : 'min-h-[480px]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="home-buddy-title"
          className="font-sans text-2xl font-medium tracking-tight"
        >
          {t.title}
        </h2>
        <Link
          href="/grammar"
          aria-label={t.openGrammar}
          className="soft-press hover-pop group/grammar bg-surface/70 hover:bg-surface hover:ring-ink/10 grid size-11 place-items-center rounded-full ring-0 ring-transparent transition-[box-shadow,background-color] hover:ring-4"
        >
          <ListChecks
            aria-hidden="true"
            className="size-5 transition-transform duration-300 ease-out group-hover/grammar:scale-110 group-hover/grammar:-rotate-6"
          />
        </Link>
      </div>

      <div className="relative grid justify-items-center gap-3 py-1">
        <span
          aria-hidden="true"
          className="bg-surface/70 absolute top-2 size-52 rounded-full blur-2xl"
        />
        {variant === 'full' ? (
          <span className="border-line bg-surface/80 absolute top-0 right-0 z-10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
            <Trophy
              aria-hidden="true"
              className="text-accent-orange size-3.5"
            />
            {format(t.done, { count: completedVideoCount })}
          </span>
        ) : null}
        <HomeBuddyMascot
          mood={mood}
          className="relative size-44 drop-shadow-[0_20px_30px_rgba(60,50,20,0.18)]"
        />
        <p className="bg-surface/85 relative inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ background: moodStyle.cover }}
          />
          <span className={moodStyle.text}>{moodText.label}</span>
        </p>
        <p className="text-ink-soft relative max-w-xs text-center text-sm leading-6">
          {format(moodText.message, { due: totalDue, streak: streakDays })}
        </p>
      </div>

      <div className="grid gap-4">
        <div className="flex items-end justify-between gap-3">
          <div className="grid min-w-0 gap-1.5">
            <p className="text-ink-soft text-sm">{t.nextUp}</p>
            <h3 className="font-sans text-2xl leading-tight font-medium tracking-tight wrap-break-word">
              {nextGrammarTitle ?? t.pickLesson}
            </h3>
          </div>
          <span
            className="border-ink/80 grid size-16 shrink-0 place-items-center rounded-full border-2 border-dashed"
            aria-label={`${t.dayStreak}: ${streakDays}`}
            role="img"
          >
            <span className="grid justify-items-center leading-none">
              <Flame
                aria-hidden="true"
                className="text-accent-orange size-4"
              />
              <strong className="font-sans text-lg font-medium">
                {streakDays}
              </strong>
            </span>
          </span>
        </div>
        {variant === 'full' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface/80 rounded-control grid gap-1 p-3">
              <span className="text-ink-soft flex items-center justify-between text-xs">
                {t.minutesThisMonth}
                <Clock3
                  aria-hidden="true"
                  className="text-accent-blue size-4"
                />
              </span>
              <strong className="font-sans text-2xl font-medium">
                {monthlyMinutes}
              </strong>
            </div>
            <div className="bg-surface/80 rounded-control grid gap-1 p-3">
              <span className="text-ink-soft flex items-center justify-between text-xs">
                {t.videosDone}
                <Trophy
                  aria-hidden="true"
                  className="text-accent-pink size-4"
                />
              </span>
              <strong className="font-sans text-2xl font-medium">
                {completedVideoCount}
              </strong>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
