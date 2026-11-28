'use client'

import { Progress } from '@/components/ui/progress'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'

interface Props {
  /** 0-based index of the sentence on screen. */
  current: number
  total: number
}

/**
 * A thin sky bar under the practice toolbar: how far through this video the
 * learner is, and how few sentences are left. Replaces the footer's
 * "Sentence 3 of 24" line.
 */
export function PracticeProgressStrip({ current, total }: Props) {
  const text = useMessages().dictation.practice
  const left = Math.max(0, total - current)

  return (
    <div className="flex min-w-0 shrink-0 items-center gap-3 px-1">
      <Progress
        aria-label={format(text.progressLabel, {
          current: current + 1,
          total,
        })}
        className="flex-1"
        tone="dictation"
        trackClassName="h-1.5"
        value={total > 0 ? Math.round((current / total) * 100) : 0}
      />
      <span className="text-ink-soft shrink-0 text-xs tabular-nums">
        {plural(text.toFinish, left)}
      </span>
    </div>
  )
}
