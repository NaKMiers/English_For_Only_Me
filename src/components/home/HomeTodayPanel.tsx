import { ArrowRight, Plus } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

interface Props {
  dictationStats?: DictationGlobalStatsRecord | null
}

function formatDuration(durationMs: number) {
  const minutes = Math.round(durationMs / 60000)

  if (minutes <= 0) return '0 min'

  return `${minutes} min`
}

export function HomeTodayPanel({ dictationStats = null }: Props) {
  const todayTasks = [
    {
      order: '1',
      title: 'Dictation Lab',
      meta: formatDuration(dictationStats?.weeklyPracticeTimeMs ?? 0),
    },
    {
      order: '2',
      title: 'Weak words review',
      meta: `${dictationStats?.weakWords.length ?? 0} words`,
    },
    {
      order: '3',
      title: 'Review queue',
      meta: `${dictationStats?.dueReviewItemCount ?? 0} due`,
    },
  ]

  return (
    <aside
      aria-label="Today focus"
      className="grid min-w-0 content-start gap-3"
    >
      <MangaPanel
        eyebrow="Now"
        title="Today"
        className="p-4"
      >
        <div className="grid gap-2">
          {todayTasks.map(task => (
            <div
              key={task.order}
              className="border-manga-black grid min-h-12 grid-cols-[38px_1fr_auto] items-center gap-2 border-b-2 py-2 max-[520px]:grid-cols-1 max-[520px]:items-start"
            >
              <span className="border-manga-black bg-manga-white grid size-8 place-items-center border-2 font-black">
                {task.order}
              </span>
              <strong className="font-sans text-base leading-tight font-black break-words uppercase">
                {task.title}
              </strong>
              <small className="text-manga-ink-soft text-sm leading-tight font-black">
                {task.meta}
              </small>
            </div>
          ))}
        </div>
      </MangaPanel>

      <MangaButton
        href="/dictation"
        icon={
          <ArrowRight
            aria-hidden="true"
            className="size-5"
          />
        }
      >
        Open Dictation Lab
      </MangaButton>
      <MangaButton
        type="button"
        tone="paper"
        disabled
        icon={
          <Plus
            aria-hidden="true"
            className="size-5"
          />
        }
      >
        Add Module Later
      </MangaButton>
    </aside>
  )
}
