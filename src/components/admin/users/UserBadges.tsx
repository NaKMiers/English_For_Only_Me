'use client'

import { Lock, ShieldCheck } from 'lucide-react'

import { MODULE_ICONS, type AppModuleKey } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'
import type {
  AdminUserRow,
  UserActivityCounts,
} from '@/modules/admin/users/userDirectory'

const ACTIVITY_KEYS: (keyof UserActivityCounts & AppModuleKey)[] = [
  'dictation',
  'grammar',
  'ielts',
  'vocabulary',
]

/** Admin and locked marks; an active learner needs no badge at all. */
export function UserStatusBadges({
  className,
  user,
}: {
  className?: string
  user: Pick<AdminUserRow, 'role' | 'status'>
}) {
  const t = useMessages().admin.users

  if (user.role !== 'admin' && user.status !== 'locked') return null

  return (
    <span className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {user.role === 'admin' ? (
        <span className="bg-brand-soft text-brand-ink rounded-tag inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium">
          <ShieldCheck
            aria-hidden="true"
            className="size-3.5"
          />
          {t.role.admin}
        </span>
      ) : null}
      {user.status === 'locked' ? (
        <span className="bg-danger-soft text-danger rounded-tag inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium">
          <Lock
            aria-hidden="true"
            className="size-3.5"
          />
          {t.status.locked}
        </span>
      ) : null}
    </span>
  )
}

/**
 * Four module chips with counts. Compact: icon + number, the module name in
 * the tooltip and for screen readers. Full: icon, number and label.
 */
export function UserActivityChips({
  activity,
  className,
  variant = 'compact',
}: {
  activity: UserActivityCounts
  className?: string
  variant?: 'compact' | 'full'
}) {
  const t = useMessages().admin.users

  return (
    <ul
      className={cn(
        variant === 'full'
          ? 'grid grid-cols-2 gap-3 sm:grid-cols-4'
          : 'flex flex-wrap gap-1.5',
        className
      )}
    >
      {ACTIVITY_KEYS.map(key => {
        const Icon = MODULE_ICONS[key]
        const theme = MODULE_THEMES[key]
        const count = activity[key]
        const label = t.activity[key]

        if (variant === 'full')
          return (
            <li
              className={cn('rounded-panel grid gap-3 p-4', theme.tint)}
              key={key}
            >
              <span
                className={cn(
                  'bg-surface/80 grid size-9 place-items-center rounded-full',
                  theme.accent
                )}
              >
                {Icon ? (
                  <Icon
                    aria-hidden="true"
                    className="size-4"
                  />
                ) : null}
              </span>
              <span className="text-ink text-3xl font-medium tabular-nums">
                {count}
              </span>
              <span className="text-ink-soft text-sm">{label}</span>
            </li>
          )

        return (
          <li
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-medium tabular-nums',
              count > 0 ? theme.tint : 'bg-surface-muted',
              count > 0 ? 'text-ink' : 'text-ink-soft'
            )}
            key={key}
            title={label}
          >
            {Icon ? (
              <Icon
                aria-hidden="true"
                className={cn('size-3.5', count > 0 && theme.accent)}
              />
            ) : null}
            {count}
            <span className="sr-only">{label}</span>
          </li>
        )
      })}
    </ul>
  )
}
