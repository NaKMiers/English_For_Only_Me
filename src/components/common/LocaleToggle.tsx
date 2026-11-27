'use client'

import { useOptimistic, useTransition } from 'react'

import { setLocaleAction } from '@/i18n/actions'
import { useLocale, useMessages } from '@/i18n/client'
import { LOCALES, type Locale } from '@/i18n/config'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  /**
   * `segmented`: both languages side by side (phone menu, where there is
   * room). `round`: one round button the size of the theme toggle that
   * shows the current language and flips to the other one (the 56px rail).
   */
  variant?: 'segmented' | 'round'
}

/**
 * EN / VI switch. The choice is stored in a cookie by a server action, which
 * re-renders the page in the new language; the control flips at once.
 */
export function LocaleToggle({ className, variant = 'segmented' }: Props) {
  const t = useMessages()
  const locale = useLocale()
  const [shown, setShown] = useOptimistic(locale)
  const [pending, startTransition] = useTransition()

  function choose(next: Locale) {
    if (next === shown) return

    startTransition(async () => {
      setShown(next)
      await setLocaleAction(next)
    })
  }

  if (variant === 'round') {
    const next = LOCALES.find(code => code !== shown) ?? shown
    const label = format(t.common.language.switchTo, {
      language: t.common.language.names[next],
    })

    return (
      <button
        type="button"
        onClick={() => choose(next)}
        aria-label={label}
        aria-busy={pending || undefined}
        title={label}
        className={cn(
          'soft-press border-line bg-surface-muted text-ink hover:bg-tint group relative grid size-12 place-items-center overflow-hidden rounded-full border',
          className
        )}
      >
        <span
          key={shown}
          lang={shown}
          className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 grid place-items-center leading-none"
        >
          <span className="font-sans text-sm font-semibold">
            {shown.toUpperCase()}
          </span>
          <span className="text-ink-soft group-hover:text-brand mt-0.5 font-sans text-[9px] font-medium transition-colors">
            {next.toUpperCase()}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div
      role="group"
      aria-label={t.common.language.label}
      aria-busy={pending || undefined}
      className={cn(
        'border-line bg-surface-muted flex items-center gap-0.5 rounded-full border p-0.5',
        className
      )}
    >
      {LOCALES.map(code => {
        const active = code === shown
        const name = t.common.language.names[code]

        return (
          // Segmented toggle relying on aria-pressed: documented raw exception.
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            aria-label={name}
            title={
              active
                ? name
                : format(t.common.language.switchTo, { language: name })
            }
            onClick={() => choose(code)}
            className={cn(
              'soft-press grid h-9 min-w-11 flex-1 place-items-center rounded-full px-3 font-sans text-xs font-semibold',
              active
                ? 'bg-cta text-cta-fg'
                : 'text-ink-soft hover:bg-tint hover:text-ink'
            )}
          >
            {code.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
