'use client'

import { Moon, Sun } from 'lucide-react'

import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'

import { useTheme } from './ThemeProvider'

interface Props {
  className?: string
}

/** Round day / night switch. The icon shows the theme a click moves to. */
export function ThemeToggle({ className }: Props) {
  const t = useMessages()
  const { theme, toggle } = useTheme()
  const night = theme === 'lightup'
  const label = night ? t.common.theme.toDay : t.common.theme.toNight

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        'soft-press border-line bg-surface-muted text-ink hover:bg-tint grid size-12 place-items-center rounded-full border',
        className
      )}
    >
      {night ? (
        <Sun
          aria-hidden="true"
          className="size-5"
        />
      ) : (
        <Moon
          aria-hidden="true"
          className="size-5"
        />
      )}
    </button>
  )
}
