'use client'

import {
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  Clock3,
  Eye,
  RotateCcw,
} from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { QueueRow } from '@/components/common/QueueRow'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useMessages } from '@/i18n/client'
import { plural } from '@/i18n/format'
import type { DictationVideoStatsRecord } from '@/modules/dictation/types'

import { formatDuration } from './formatDuration'

interface Props {
  stats: DictationVideoStatsRecord
}

export function DictationStatsPanel({ stats }: Props) {
  const t = useMessages()
  const text = t.dictation.stats

  return (
    <div className="grid min-w-0 gap-5">
      {/* Completion and first try live in the head above; the rest is a
          quiet line. */}
      <p className="text-ink-soft flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <ChartNoAxesColumnIncreasing
            aria-hidden="true"
            className="size-4"
          />
          {text.overall}: {stats.overallWordAccuracy}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3
            aria-hidden="true"
            className="size-4"
          />
          {formatDuration(t.dictation.duration, stats.timeSpentMs)} ·{' '}
          {plural(text.retries, stats.retryCount)}
        </span>
      </p>

      <ContentPanel
        eyebrow={text.hardestEyebrow}
        title={text.hardestTitle}
      >
        {stats.hardestSegments.length > 0 ? (
          <div className="grid gap-3">
            {stats.hardestSegments.map(segment => (
              <QueueRow
                key={segment.segmentId}
                title={segment.label}
                meta={plural(text.hardestMeta, segment.attemptCount, {
                  accuracy: segment.accuracy,
                })}
                status="review"
              />
            ))}
          </div>
        ) : (
          <p className="text-ink-soft text-base leading-7 font-normal">
            {text.hardestEmpty}
          </p>
        )}
      </ContentPanel>

      <Collapsible>
        <CollapsibleTrigger className="soft-press hover-pop group border-line bg-surface rounded-panel flex min-h-12 w-full items-center justify-between gap-3 border px-4 py-3 text-left font-sans text-base font-medium">
          {t.common.journey.details}
          <ChevronDown
            aria-hidden="true"
            className="size-5 transition-transform group-data-panel-open:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsiblePanel className="grid gap-5 pt-5">
          <ContentPanel
            eyebrow={text.taxonomyEyebrow}
            title={text.mistakeMap}
          >
            <div className="grid gap-3">
              <QueueRow
                title={text.mistakeTypes.missing}
                meta={plural(text.tokens, stats.mistakeTaxonomy.missing)}
                status="gap"
              />
              <QueueRow
                title={text.mistakeTypes.wrong}
                meta={plural(text.tokens, stats.mistakeTaxonomy.wrong)}
                status="swap"
              />
              <QueueRow
                title={text.mistakeTypes.extra}
                meta={plural(text.tokens, stats.mistakeTaxonomy.extra)}
                status="extra"
              />
              <QueueRow
                title={text.mistakeTypes.spellingVariant}
                meta={plural(
                  text.tokens,
                  stats.mistakeTaxonomy.spellingVariant
                )}
                status="spell"
              />
            </div>
          </ContentPanel>
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <ContentPanel
              eyebrow={text.wordsEyebrow}
              title={text.missedWords}
            >
              {stats.commonMissedWords.length > 0 ? (
                <div className="grid gap-3">
                  {stats.commonMissedWords.map(word => (
                    <QueueRow
                      key={word.word}
                      title={word.word}
                      meta={plural(text.misses, word.count)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-ink-soft text-base leading-7 font-normal">
                  {text.missedWordsEmpty}
                </p>
              )}
            </ContentPanel>

            <ContentPanel
              eyebrow={text.behaviorEyebrow}
              title={text.recoveryTitle}
            >
              <div className="grid gap-3">
                <QueueRow
                  title={text.replays}
                  meta={plural(text.replaysMeta, stats.replayCount)}
                  action={
                    <RotateCcw
                      aria-hidden="true"
                      className="size-5"
                    />
                  }
                />
                <QueueRow
                  title={text.reveals}
                  meta={plural(text.revealsMeta, stats.revealCount)}
                  action={
                    <Eye
                      aria-hidden="true"
                      className="size-5"
                    />
                  }
                />
                <QueueRow
                  title={text.skips}
                  meta={plural(text.skipsMeta, stats.skipCount)}
                />
              </div>
            </ContentPanel>
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </div>
  )
}
