'use client'

import { ScrollText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { ActionButton } from '@/components/ui/ActionButton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { DictationSegmentApiRecord } from '@/modules/dictation/types'

interface Props {
  currentSegmentId: string
  defaultOpen?: boolean
  segments: DictationSegmentApiRecord[]
}

function formatTiming(segment: DictationSegmentApiRecord) {
  if (segment.startMs === null || segment.endMs === null) return 'untimed'

  return `${(segment.startMs / 1000).toFixed(1)}s - ${(
    segment.endMs / 1000
  ).toFixed(1)}s`
}

function TranscriptSegmentList({
  currentSegmentId,
  segments,
}: {
  currentSegmentId: string
  segments: DictationSegmentApiRecord[]
}) {
  return (
    <div className="grid snap-y snap-proximity gap-3 overflow-y-auto p-4">
      {segments.map(segment => (
        <article
          key={segment.id}
          aria-current={segment.id === currentSegmentId ? 'step' : undefined}
          className={cn(
            'border-line bg-surface rounded-control grid snap-start gap-2 border p-3',
            segment.id === currentSegmentId && 'bg-tint'
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-line bg-surface text-ink rounded-tag border font-semibold">
              #{segment.order + 1}
            </Badge>
            <Badge className="border-line bg-tint-soft text-ink rounded-tag border font-semibold">
              {formatTiming(segment)}
            </Badge>
          </div>
          <p className="text-sm leading-6 font-semibold">{segment.text}</p>
        </article>
      ))}
    </div>
  )
}

export function DictationTranscriptDrawer({
  currentSegmentId,
  defaultOpen,
  segments,
}: Props) {
  if (defaultOpen)
    return (
      <div className="border-line bg-surface rounded-panel overflow-hidden border">
        <TranscriptSegmentList
          currentSegmentId={currentSegmentId}
          segments={segments}
        />
      </div>
    )

  return (
    <Sheet>
      <SheetTrigger
        render={
          <ActionButton
            type="button"
            tone="paper"
            icon={
              <ScrollText
                aria-hidden="true"
                className="size-5"
              />
            }
          >
            Full Transcript
          </ActionButton>
        }
      />
      <SheetContent className="border-line bg-surface w-[min(92vw,520px)] border-l">
        <SheetHeader className="border-line border-b">
          <SheetTitle className="font-sans text-2xl font-semibold">
            Full transcript
          </SheetTitle>
          <SheetDescription className="text-ink-soft font-normal">
            Current sentence stays marked while you move through practice.
          </SheetDescription>
        </SheetHeader>

        <TranscriptSegmentList
          currentSegmentId={currentSegmentId}
          segments={segments}
        />
      </SheetContent>
    </Sheet>
  )
}
