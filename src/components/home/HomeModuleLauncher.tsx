import {
  BookOpen,
  Bot,
  Headphones,
  Languages,
  NotebookPen,
  SpellCheck,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { APP_MODULES, type AppModuleKey } from '@/constants/modules'

import { ModuleCard } from '../ui/ModuleCard'

const moduleIcons: Record<AppModuleKey, ReactNode> = {
  dictation: (
    <Headphones
      aria-hidden="true"
      className="size-6"
    />
  ),
  vocabulary: (
    <SpellCheck
      aria-hidden="true"
      className="size-6"
    />
  ),
  'writing-notes': (
    <NotebookPen
      aria-hidden="true"
      className="size-6"
    />
  ),
  'ai-coach': (
    <Bot
      aria-hidden="true"
      className="size-6"
    />
  ),
  reading: (
    <BookOpen
      aria-hidden="true"
      className="size-6"
    />
  ),
  speaking: (
    <Headphones
      aria-hidden="true"
      className="size-6"
    />
  ),
  grammar: (
    <Languages
      aria-hidden="true"
      className="size-6"
    />
  ),
}

const LAUNCHER_SLOTS = 4

/**
 * The study desk shows four cards, and every ACTIVE module is guaranteed one.
 *
 * This used to be `APP_MODULES.slice(0, 4)`, which only worked by accident:
 * declaration order happened to put the two active modules first. Adding a
 * third active module silently pushed a real, usable module off the desk in
 * favour of a placeholder with no route. Active modules now take slots first
 * and placeholders fill whatever is left, so a fourth active module displaces a
 * planned one instead of disappearing.
 */
const launcherModules = [
  ...APP_MODULES.filter(module => module.status === 'active'),
  ...APP_MODULES.filter(module => module.status !== 'active'),
].slice(0, LAUNCHER_SLOTS)

export function HomeModuleLauncher() {
  return (
    <section
      aria-label="English learning modules"
      className="border-manga-black bg-manga-pale-red/70 border-t-3 p-4"
    >
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {launcherModules.map(module => (
          <ModuleCard
            key={module.key}
            href={module.status === 'active' ? module.href : undefined}
            title={module.title}
            description={module.description}
            pageTag={module.pageTag}
            skill={module.skill}
            status={module.status}
            cta={module.status === 'active' ? 'Open' : 'Planned'}
            icon={moduleIcons[module.key]}
            className="min-h-44"
          />
        ))}
      </div>
    </section>
  )
}
