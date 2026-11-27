import {
  BookA,
  GraduationCap,
  Headphones,
  PenLine,
  Star,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { APP_MODULES, type AppModuleKey } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'

export const MODULE_ICONS: Partial<Record<AppModuleKey, LucideIcon>> = {
  dictation: Headphones,
  vocabulary: BookA,
  grammar: PenLine,
  ielts: GraduationCap,
}

interface Props {
  /** One short fact per module, shown under its title. */
  facts: Partial<Record<AppModuleKey, string>>
  messages: Messages
}

/** The four live modules as big pastel tiles, like a course shelf. */
export function HomeModuleTiles({ facts, messages }: Props) {
  const modules = APP_MODULES.filter(module => module.status === 'active')

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
                className="soft-press hover-lift border-line group grid h-full gap-3 rounded-[22px] border p-2 pb-3"
              >
                <span
                  className={cn(
                    'relative grid aspect-[5/4] place-items-center overflow-hidden rounded-2xl',
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
                  <strong className="truncate font-sans text-sm font-medium">
                    {text.title}
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
