import {
  BookOpen,
  Bot,
  Headphones,
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
}

const launcherModules = APP_MODULES.slice(0, 4)

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
