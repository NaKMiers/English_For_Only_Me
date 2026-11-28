import { Star } from 'lucide-react'
import Link from 'next/link'

import {
  APP_MODULES,
  MODULE_ICONS,
  type AppModuleKey,
} from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'

interface Props {
  /** One short fact per module, shown under its title. */
  facts: Partial<Record<AppModuleKey, string>>
  messages: Messages
}

/** The four live modules as big pastel tiles, like a course shelf. */
export function HomeModuleTiles({ facts, messages }: Props) {
  const modules = APP_MODULES

  return (
    <section
      aria-labelledby="home-modules-title"
      className="grid gap-4"
    >
      <h2
        id="home-modules-title"
        className="font-sans text-lg font-medium"
      >
        {messages.home.modulesTitle}
      </h2>
      <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-4">
        {modules.map(module => {
          const Icon = MODULE_ICONS[module.key] ?? Star
          const theme = MODULE_THEMES[module.key]
          const text = messages.common.modules[module.key]

          return (
            <li
              key={module.key}
              className="min-w-0"
            >
              <Link
                href={module.href}
                className="soft-press hover-pop border-line group rounded-panel grid h-full gap-3 border p-2 pb-3"
              >
                <span
                  className={cn(
                    'rounded-control relative grid aspect-[5/4] place-items-center overflow-hidden',
                    theme.tint
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="bg-surface/60 absolute top-3 right-3 size-10 rounded-full"
                  />
                  <span
                    aria-hidden="true"
                    className="bg-surface/40 absolute bottom-2 left-3 size-6 rounded-full"
                  />
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.6}
                    className={cn(
                      'relative size-12 transition-transform duration-300 group-hover:-rotate-6',
                      theme.accent
                    )}
                  />
                </span>
                <span className="grid gap-1 px-1.5">
                  {/* Short name where the row is narrowest (xl), full name otherwise. */}
                  <strong className="truncate font-sans text-sm font-medium">
                    <span className="hidden xl:inline 2xl:hidden">
                      {text.shortTitle}
                    </span>
                    <span className="xl:hidden 2xl:inline">{text.title}</span>
                  </strong>
                  <span className="text-ink-soft truncate text-xs">
                    {facts[module.key] ?? text.skill}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
