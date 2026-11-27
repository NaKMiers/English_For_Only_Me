'use client'

import { useOptimistic, useTransition } from 'react'

import { setLocaleAction } from '@/i18n/actions'
import { useLocale, useMessages } from '@/i18n/client'
import { LOCALES, type Locale } from '@/i18n/config'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

/**
 * EN / VI pill. The choice is stored in a cookie by a server action, which
 * re-renders the page in the new language; the pill flips at once.
 */
export function LocaleToggle({ className }: Props) {
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
              'soft-press grid h-8 min-w-8 flex-1 place-items-center rounded-full px-1.5 font-sans text-xs font-semibold',
              active
                ? 'bg-ink text-surface'
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
