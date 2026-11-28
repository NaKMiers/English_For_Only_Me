'use client'

import { Check, Headphones } from 'lucide-react'
import { useEffect, useState, type CSSProperties } from 'react'

import { HomeBuddyMascot } from '@/components/home/HomeBuddyMascot'
import { MODULE_ICONS, type AppModuleKey } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import { useMessages } from '@/i18n/client'
import { useReducedMotion } from '@/lib/motion/useReducedMotion'
import { cn } from '@/lib/utils'

/**
 * English lines the hero's dictation strip types out. Practice data, like a
 * transcript, so it stays in English in both UI languages.
 */
export const LOGIN_HERO_SENTENCES = [
  'Listen closely, then write it down.',
  'Every word you hear is a word you learn.',
  'Practice makes progress, not perfection.',
  'Small steps every day add up.',
] as const

const TYPE_DELAY_MS = 55
const HOLD_DELAY_MS = 2400

interface FloatingCard {
  key: AppModuleKey
  /** Where the card sits around Buddy. */
  position: string
  /** Shown only from this breakpoint up, so a phone keeps two cards. */
  visibility: string
  /** Rise delay and float rhythm; custom properties reach the inner card. */
  style: CSSProperties
}

const FLOATING_CARDS: FloatingCard[] = [
  {
    key: 'dictation',
    position: 'left-[5%] top-[9%] lg:left-[8%] lg:top-[13%]',
    visibility: 'flex',
    style: {
      '--float-delay': '0s',
      '--float-duration': '6.5s',
      '--rise-delay': '120ms',
    } as CSSProperties,
  },
  {
    key: 'grammar',
    position: 'right-[5%] top-[14%] lg:right-[7%] lg:top-[19%]',
    visibility: 'hidden sm:flex',
    style: {
      '--float-delay': '-2s',
      '--float-duration': '7.5s',
      '--rise-delay': '220ms',
    } as CSSProperties,
  },
  {
    key: 'vocabulary',
    position: 'left-[4%] bottom-[34%] lg:left-[6%] lg:bottom-[33%]',
    visibility: 'hidden sm:flex',
    style: {
      '--float-delay': '-4s',
      '--float-duration': '7s',
      '--rise-delay': '320ms',
    } as CSSProperties,
  },
  {
    key: 'ielts',
    position: 'right-[5%] bottom-[12%] sm:bottom-[30%] lg:right-[7%]',
    visibility: 'flex',
    style: {
      '--float-delay': '-1s',
      '--float-duration': '8s',
      '--rise-delay': '420ms',
    } as CSSProperties,
  },
]

/**
 * Types each sentence one letter at a time, holds it with a tick, then moves
 * to the next. With reduced motion it shows the first sentence, finished.
 */
function useTypedSentence(lines: readonly string[], reduced: boolean) {
  const [cursor, setCursor] = useState({ line: 0, length: 0 })
  const sentence = lines[cursor.line] ?? ''
  const done = cursor.length >= sentence.length

  useEffect(() => {
    if (reduced) return

    const timer = window.setTimeout(
      () => {
        setCursor(current =>
          current.length >= (lines[current.line] ?? '').length
            ? { line: (current.line + 1) % lines.length, length: 0 }
            : { ...current, length: current.length + 1 }
        )
      },
      done ? HOLD_DELAY_MS : TYPE_DELAY_MS + (cursor.length % 3) * 25
    )

    return () => window.clearTimeout(timer)
  }, [cursor, done, lines, reduced])

  if (reduced) return { done: true, text: lines[0] ?? '' }

  return { done, text: sentence.slice(0, cursor.length) }
}

/**
 * The login page's left half: Buddy on a pastel aurora, the four modules as
 * floating glass cards and a dictation line that types itself. Purely
 * decorative (the form beside it carries every word that matters), so the
 * whole thing is hidden from assistive tech.
 */
export function LoginHero({ className }: { className?: string }) {
  const t = useMessages()
  const { reduced } = useReducedMotion()
  const typed = useTypedSentence(LOGIN_HERO_SENTENCES, reduced)

  return (
    <div
      aria-hidden="true"
      className={cn(
        'login-hero relative overflow-hidden',
        'lg:rounded-shell rounded-b-panel',
        className
      )}
      data-testid="login-hero"
    >
      <div className="login-hero-grid pointer-events-none absolute inset-0" />
      <span
        className="login-orb bg-brand-soft pointer-events-none absolute -top-16 -right-10 size-64 rounded-full opacity-80 blur-3xl"
        style={{ '--drift-x': '-30px', '--drift-y': '26px' } as CSSProperties}
      />
      <span
        className="login-orb bg-pastel-sky pointer-events-none absolute -bottom-20 -left-16 size-72 rounded-full opacity-90 blur-3xl"
        style={
          {
            '--drift-duration': '19s',
            '--drift-x': '34px',
            '--drift-y': '-20px',
          } as CSSProperties
        }
      />
      <span
        className="login-orb bg-pastel-lemon pointer-events-none absolute top-1/3 left-1/2 size-48 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{ '--drift-duration': '22s' } as CSSProperties}
      />

      <div className="relative grid h-full place-items-center px-6 pt-8 pb-10 sm:pb-28 lg:pb-32">
        <div className="login-rise relative grid place-items-center">
          <span className="bg-surface/60 absolute size-[78%] rounded-full blur-2xl" />
          <span className="border-surface/70 absolute size-[96%] rounded-full border" />
          <HomeBuddyMascot
            className="login-buddy relative size-36 sm:size-48 lg:size-64 xl:size-72"
            eager
            mood="happy"
            sizes="(min-width: 1280px) 288px, (min-width: 1024px) 256px, (min-width: 640px) 192px, 144px"
          />
        </div>
      </div>

      {FLOATING_CARDS.map(card => {
        const Icon = MODULE_ICONS[card.key]
        const theme = MODULE_THEMES[card.key]

        return (
          <div
            className={cn('login-rise absolute', card.position)}
            key={card.key}
            style={card.style}
          >
            <div
              className={cn(
                'login-float login-glass rounded-control items-center gap-2.5 py-2 pr-3.5 pl-2 sm:gap-3 sm:py-2.5 sm:pr-4',
                card.visibility
              )}
            >
              <span
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-xl sm:size-9',
                  theme.tint,
                  theme.accent
                )}
              >
                {Icon ? <Icon className="size-4 sm:size-[18px]" /> : null}
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-ink text-sm font-medium">
                  {t.common.modules[card.key].shortTitle}
                </span>
                <span className="text-ink-soft hidden text-xs sm:block">
                  {t.common.auth.loginModuleHints[card.key]}
                </span>
              </span>
            </div>
          </div>
        )
      })}

      <div
        className="login-rise absolute inset-x-0 bottom-6 hidden justify-center px-6 sm:flex lg:bottom-10"
        style={{ '--rise-delay': '560ms' } as CSSProperties}
      >
        <div className="login-glass rounded-control flex w-full max-w-md items-center gap-3 p-3 pr-4">
          <span className="bg-pastel-sky text-accent-blue grid size-10 shrink-0 place-items-center rounded-xl">
            <Headphones className="size-[18px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-ink-soft text-[11px] font-medium tracking-wide uppercase">
              {t.common.auth.loginHeroNowPlaying}
            </span>
            <span
              className="text-ink truncate text-sm"
              data-testid="login-hero-typed"
            >
              {typed.text}
              {typed.done ? null : (
                <span className="login-caret bg-brand ml-px inline-block h-4 w-0.5 translate-y-0.5" />
              )}
            </span>
          </span>
          <span
            className={cn(
              'bg-pastel-mint text-accent-green grid size-7 shrink-0 place-items-center rounded-full transition-[opacity,scale] duration-300',
              typed.done ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            )}
          >
            <Check className="size-4" />
          </span>
        </div>
      </div>
    </div>
  )
}
