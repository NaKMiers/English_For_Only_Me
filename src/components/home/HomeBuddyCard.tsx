import { Clock3, Flame, ListChecks, Trophy } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  completedVideoCount: number
  monthlyMinutes: number
  nextGrammarTitle: string | null
  streakDays: number
}

/**
 * The big highlight card: the app's mascot on a lemon glow, what to study
 * next, and two small counters. The reference design's "featured course".
 */
export function HomeBuddyCard({
  completedVideoCount,
  monthlyMinutes,
  nextGrammarTitle,
  streakDays,
}: Props) {
  return (
    <section
      aria-labelledby="home-buddy-title"
      className="border-line relative grid min-h-[560px] content-between gap-5 overflow-hidden rounded-[28px] border bg-[linear-gradient(170deg,var(--pastel-lemon),var(--pastel-cream)_55%,var(--surface))] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="home-buddy-title"
          className="font-sans text-2xl font-medium tracking-tight"
        >
          Study buddy
        </h2>
        <Link
          href="/grammar"
          aria-label="Open the grammar path"
          className="soft-press bg-surface/70 hover:bg-surface grid size-11 place-items-center rounded-full"
        >
          <ListChecks
            aria-hidden="true"
            className="size-5"
          />
        </Link>
      </div>

      <div className="relative grid place-items-center py-2">
        <span
          aria-hidden="true"
          className="bg-surface/70 absolute size-56 rounded-full blur-2xl"
        />
        <span className="border-line bg-surface/80 absolute top-0 right-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
          <Trophy
            aria-hidden="true"
            className="text-accent-orange size-3.5"
          />
          {completedVideoCount} done
        </span>
        <Image
          src="/logo.png"
          alt=""
          width={200}
          height={200}
          className="relative size-44 -rotate-3 rounded-[40px] object-contain drop-shadow-[0_20px_30px_rgba(60,50,20,0.18)]"
        />
      </div>

      <div className="grid gap-4">
        <div className="flex items-end justify-between gap-3">
          <div className="grid min-w-0 gap-1.5">
            <p className="text-ink-soft text-sm">Next up</p>
            <h3 className="font-sans text-2xl leading-tight font-medium tracking-tight wrap-break-word">
              {nextGrammarTitle ?? 'Pick a lesson'}
            </h3>
          </div>
          <span
            className="border-ink/80 grid size-16 shrink-0 place-items-center rounded-full border-2 border-dashed"
            title="Day streak"
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
        <p className="text-ink-soft text-sm leading-6">
          Short, steady sessions beat long ones. Keep the streak going with one
          listening clip and one grammar lesson.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface/80 grid gap-1 rounded-2xl p-3">
            <span className="text-ink-soft flex items-center justify-between text-xs">
              Minutes this month
              <Clock3
                aria-hidden="true"
                className="text-accent-blue size-4"
              />
            </span>
            <strong className="font-sans text-2xl font-medium">
              {monthlyMinutes}
            </strong>
          </div>
          <div className="bg-surface/80 grid gap-1 rounded-2xl p-3">
            <span className="text-ink-soft flex items-center justify-between text-xs">
              Videos done
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
      </div>
    </section>
  )
}
