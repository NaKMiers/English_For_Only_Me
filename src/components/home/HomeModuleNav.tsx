import { Sparkles } from 'lucide-react'
import Link from 'next/link'

import { APP_MODULES, MODULE_ICONS } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'

/** The module links beside the dashboard title: one outlined pill each. */
export function HomeModuleNav({ messages }: { messages: Messages }) {
  return (
    <nav
      aria-label={messages.home.modulesNav}
      className="flex flex-wrap gap-2"
    >
      {APP_MODULES.filter(module => module.status === 'active').map(module => {
        const Icon = MODULE_ICONS[module.key] ?? Sparkles
        const theme = MODULE_THEMES[module.key]

        return (
          <Link
            key={module.key}
            href={module.href}
            className={cn(
              'soft-press bg-surface hover:bg-tint-soft inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-sm font-medium',
              theme.outline,
              theme.accent
            )}
          >
            <Icon
              aria-hidden="true"
              className="size-4"
            />
            {messages.common.modules[module.key].shortTitle}
          </Link>
        )
      })}
    </nav>
  )
}
