'use client'

import {
  ChevronRight,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useDeferredValue, useMemo, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Segmented } from '@/components/ui/segmented'
import { useLocale, useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import { cn } from '@/lib/utils'
import {
  formatCalendarDate,
  formatRelativeDate,
} from '@/modules/admin/users/formatUserDates'
import {
  filterAndSortUsers,
  summarizeUsers,
  USER_SORTS,
  type AdminUserRow,
  type UserSort,
} from '@/modules/admin/users/userDirectory'

import { UserActivityChips, UserStatusBadges } from './UserBadges'
import { UserAvatar } from './UserAvatar'

interface Props {
  /** Server time of the render, so relative dates match on both sides. */
  now: number
  users: AdminUserRow[]
}

/**
 * The admin user list: four summary tiles, a search box and sort, then one
 * row per learner (photo, name, email, badges, practice chips, last sign-in)
 * linking to their page. Filtering runs in the browser: the list is small
 * and a keystroke should answer at once.
 */
export function UserDirectory({ now, users }: Props) {
  const t = useMessages().admin.users
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<UserSort>('recent')
  const deferredQuery = useDeferredValue(query)
  const rows = useMemo(
    () => filterAndSortUsers(users, { query: deferredQuery, sort }),
    [deferredQuery, sort, users]
  )
  const summary = useMemo(() => summarizeUsers(users, now), [now, users])

  const tiles = [
    {
      icon: Users,
      label: t.summary.total,
      tone: 'bg-pastel-sky text-accent-blue',
      value: summary.total,
    },
    {
      icon: Sparkles,
      label: t.summary.activeThisWeek,
      tone: 'bg-pastel-mint text-accent-green',
      value: summary.activeThisWeek,
    },
    {
      icon: Lock,
      label: t.summary.locked,
      tone: 'bg-danger-soft text-danger',
      value: summary.locked,
    },
    {
      icon: ShieldCheck,
      label: t.summary.admins,
      tone: 'bg-brand-soft text-brand-ink',
      value: summary.admins,
    },
  ]

  return (
    <div className="grid gap-5">
      <ul className="motion-stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(tile => {
          const Icon = tile.icon

          return (
            <li
              className="bg-surface border-line rounded-panel shadow-card flex items-center gap-3 border p-4"
              key={tile.label}
            >
              <span
                className={cn(
                  'rounded-control grid size-11 shrink-0 place-items-center',
                  tile.tone
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="size-5"
                />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-ink text-2xl font-medium tabular-nums">
                  {tile.value}
                </span>
                <span className="text-ink-soft truncate text-xs sm:text-sm">
                  {tile.label}
                </span>
              </span>
            </li>
          )
        })}
      </ul>

      <section className="bg-surface border-line rounded-panel shadow-card grid gap-4 border p-3 sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="relative block w-full md:max-w-sm">
            <span className="sr-only">{t.searchLabel}</span>
            <Search
              aria-hidden="true"
              className="text-ink-soft pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            />
            <Input
              className="h-11 rounded-full pl-10"
              onChange={event => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              type="search"
              value={query}
            />
          </label>
          <Segmented
            label={t.sortLabel}
            onChange={setSort}
            options={USER_SORTS.map(value => ({
              label: t.sorts[value],
              value,
            }))}
            size="sm"
            value={sort}
          />
        </div>

        <p
          aria-live="polite"
          className="text-ink-soft px-1 text-xs"
        >
          {plural(t.showing, rows.length)}
        </p>

        {rows.length === 0 ? (
          <p className="text-ink-soft rounded-panel bg-surface-muted px-4 py-10 text-center text-sm">
            {users.length === 0
              ? t.empty
              : format(t.noMatch, { query: deferredQuery.trim() })}
          </p>
        ) : (
          <ul className="divide-line grid divide-y">
            {rows.map(user => {
              const name = user.name || t.noName
              const lastLogin =
                formatRelativeDate(user.lastLoginAt, now, locale) ?? t.never

              return (
                <li key={user.id}>
                  <Link
                    aria-label={format(t.openUser, {
                      name: user.name || user.email,
                    })}
                    className={cn(
                      'group hover:bg-tint-soft focus-visible:ring-brand/40 rounded-control grid items-center gap-x-4 gap-y-2 px-2 py-3 outline-none focus-visible:ring-2 sm:px-3',
                      'grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1.6fr)_minmax(0,1.2fr)_8.5rem_auto]',
                      user.status === 'locked' && 'opacity-75'
                    )}
                    href={`/admin/users/${user.id}`}
                  >
                    <UserAvatar
                      image={user.image}
                      label={user.name || user.email}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex min-w-0 flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'truncate text-sm font-medium',
                            user.name ? 'text-ink' : 'text-ink-soft italic'
                          )}
                        >
                          {name}
                        </span>
                        <UserStatusBadges user={user} />
                      </span>
                      <span className="text-ink-soft truncate text-xs">
                        {user.email}
                      </span>
                    </span>
                    <UserActivityChips
                      activity={user.activity}
                      className="col-span-3 col-start-1 md:col-span-1 md:col-start-auto"
                    />
                    <span className="hidden flex-col text-right md:flex">
                      <span className="text-ink text-sm">{lastLogin}</span>
                      <span className="text-ink-soft text-xs">
                        {formatCalendarDate(user.createdAt, locale)}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="text-ink-soft col-start-3 row-start-1 size-4 transition-transform group-hover:translate-x-0.5 md:col-start-auto md:row-start-auto"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
