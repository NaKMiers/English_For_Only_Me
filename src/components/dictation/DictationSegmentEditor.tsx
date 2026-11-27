'use client'

import { Check, Merge, Scissors, TimerReset } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ActionButton } from '@/components/ui/ActionButton'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  applyLocalSegmentEdit,
  editSegment,
} from '@/modules/dictation/segmenting/editSegments'
import type { EditableSegment } from '@/modules/dictation/segmenting/types'
import type { DictationSegmentApiRecord } from '@/modules/dictation/types'

interface Props {
  className?: string
  initialSegments: DictationSegmentApiRecord[]
}

function toEditableSegment(
  segment: DictationSegmentApiRecord
): EditableSegment {
  return {
    cueIndexes: segment.cueIndexes,
    endMs: segment.endMs,
    id: segment.id,
    normalizedText: segment.normalizedText,
    order: segment.order,
    qualityFlags: segment.qualityFlags,
    startMs: segment.startMs,
    text: segment.text,
    warningAccepted: segment.warningAccepted,
  }
}

function formatTimeValue(value: number | null) {
  if (value === null) return ''

  return String(value)
}

function parseTimeValue(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) return null

  const parsedValue = Number(trimmedValue)

  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? Math.round(parsedValue)
    : null
}

export function DictationSegmentEditor({ className, initialSegments }: Props) {
  const [segments, setSegments] = useState(
    initialSegments.map(toEditableSegment)
  )
  const orderedSegments = useMemo(
    () => segments.toSorted((left, right) => left.order - right.order),
    [segments]
  )

  function updateText(segment: EditableSegment, text: string) {
    setSegments(currentSegments =>
      currentSegments.map(item =>
        item.id === segment.id ? editSegment(item, { text }) : item
      )
    )
  }

  function updateTime(
    segment: EditableSegment,
    field: 'endMs' | 'startMs',
    value: string
  ) {
    setSegments(currentSegments =>
      currentSegments.map(item =>
        item.id === segment.id
          ? editSegment(item, {
              [field]: parseTimeValue(value),
              text: item.text,
            })
          : item
      )
    )
  }

  function applyAction(
    segment: EditableSegment,
    action: Parameters<typeof applyLocalSegmentEdit>[2]
  ) {
    setSegments(currentSegments =>
      applyLocalSegmentEdit(currentSegments, segment.id, action)
    )
  }

  return (
    <ContentPanel
      eyebrow="Segment editor"
      title="Sentence source cleanup"
      className={className}
    >
      <div className="grid gap-3">
        {orderedSegments.map((segment, index) => (
          <article
            key={segment.id}
            className="border-line bg-tint rounded-control grid min-w-0 gap-3 border p-3"
          >
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge className="border-line bg-surface text-ink rounded-tag border font-semibold">
                  #{index + 1}
                </Badge>
                {segment.qualityFlags.map(flag => (
                  <Badge
                    key={flag}
                    className={cn(
                      'border-line rounded-tag border font-semibold',
                      segment.warningAccepted
                        ? 'bg-surface text-ink'
                        : 'bg-brand text-surface'
                    )}
                  >
                    {flag}
                  </Badge>
                ))}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <IconButton
                  label="Split segment"
                  onClick={() =>
                    applyAction(segment, {
                      action: 'split',
                      splitAt: Math.max(1, Math.floor(segment.text.length / 2)),
                    })
                  }
                >
                  <Scissors
                    aria-hidden="true"
                    className="size-5"
                  />
                </IconButton>
                <IconButton
                  label="Merge with previous segment"
                  onClick={() =>
                    applyAction(segment, { action: 'mergePrevious' })
                  }
                >
                  <Merge
                    aria-hidden="true"
                    className="size-5 rotate-180"
                  />
                </IconButton>
                <IconButton
                  label="Merge with next segment"
                  onClick={() => applyAction(segment, { action: 'mergeNext' })}
                >
                  <Merge
                    aria-hidden="true"
                    className="size-5"
                  />
                </IconButton>
              </div>
            </div>

            <div className="grid gap-2">
              <Label
                htmlFor={`segment-text-${segment.id}`}
                className="font-sans text-xs font-semibold tracking-normal"
              >
                Segment text
              </Label>
              <Textarea
                id={`segment-text-${segment.id}`}
                value={segment.text}
                onChange={event => updateText(segment, event.target.value)}
                className="border-line bg-surface rounded-control min-h-24 border text-base leading-7 font-semibold"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Label className="grid gap-2">
                <span className="font-sans text-xs font-semibold tracking-normal">
                  Start ms
                </span>
                <Input
                  type="number"
                  min={0}
                  value={formatTimeValue(segment.startMs)}
                  onChange={event =>
                    updateTime(segment, 'startMs', event.target.value)
                  }
                  className="border-line bg-surface rounded-control min-h-11 min-w-0 border px-3 py-2 font-semibold"
                />
              </Label>
              <Label className="grid gap-2">
                <span className="font-sans text-xs font-semibold tracking-normal">
                  End ms
                </span>
                <Input
                  type="number"
                  min={0}
                  value={formatTimeValue(segment.endMs)}
                  onChange={event =>
                    updateTime(segment, 'endMs', event.target.value)
                  }
                  className="border-line bg-surface rounded-control min-h-11 min-w-0 border px-3 py-2 font-semibold"
                />
              </Label>
              <ActionButton
                tone={segment.warningAccepted ? 'paper' : 'primary'}
                className="self-end"
                icon={
                  segment.warningAccepted ? (
                    <Check
                      aria-hidden="true"
                      className="size-5"
                    />
                  ) : (
                    <TimerReset
                      aria-hidden="true"
                      className="size-5"
                    />
                  )
                }
                onClick={() =>
                  applyAction(segment, { action: 'acceptWarning' })
                }
              >
                {segment.warningAccepted
                  ? 'Warning Accepted'
                  : 'Accept Warning'}
              </ActionButton>
            </div>
          </article>
        ))}
      </div>
    </ContentPanel>
  )
}
