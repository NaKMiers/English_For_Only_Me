import { BookOpen, Headphones, Mic, PenLine } from 'lucide-react'

import { QueueRow } from '@/components/common/QueueRow'

const moduleMap = [
  {
    title: 'Listening',
    meta: 'Dictation, shadowing, weak-sound review.',
    status: 'Active',
    icon: (
      <Headphones
        aria-hidden="true"
        className="size-4"
      />
    ),
  },
  {
    title: 'Reading',
    meta: 'Article mining and phrase collection.',
    status: 'Later',
    icon: (
      <BookOpen
        aria-hidden="true"
        className="size-4"
      />
    ),
  },
  {
    title: 'Writing',
    meta: 'Essay ideas, feedback, correction history.',
    status: 'Later',
    icon: (
      <PenLine
        aria-hidden="true"
        className="size-4"
      />
    ),
  },
  {
    title: 'Speaking',
    meta: 'Shadowing notes and answer rehearsal.',
    status: 'Later',
    icon: (
      <Mic
        aria-hidden="true"
        className="size-4"
      />
    ),
  },
]

export function HomeFutureModuleMap() {
  return (
    <section
      aria-label="Future module map"
      className="grid gap-3"
    >
      {moduleMap.map(module => (
        <QueueRow
          key={module.title}
          title={module.title}
          meta={module.meta}
          status={module.status}
          action={
            <span className="border-manga-black bg-manga-white grid size-8 shrink-0 place-items-center border-2">
              {module.icon}
            </span>
          }
        />
      ))}
    </section>
  )
}
