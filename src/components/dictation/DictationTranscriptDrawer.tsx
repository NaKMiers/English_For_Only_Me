'use client'

import { ScrollText } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { MangaButton } from '@/components/ui/MangaButton'
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
    <div className="grid gap-3 overflow-y-auto p-4">
      {segments.map(segment => (
        <article
          key={segment.id}
          aria-current={segment.id === currentSegmentId ? 'step' : undefined}
          className={cn(
            'border-manga-black bg-manga-white grid gap-2 border-2 p-3 shadow-[3px_3px_0_var(--manga-black)]',
            segment.id === currentSegmentId && 'bg-manga-paper-soft'
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-manga-black bg-manga-white text-manga-black rounded-none border-2 font-black">
              #{segment.order + 1}
            </Badge>
            <Badge className="border-manga-black bg-manga-pale-red text-manga-black rounded-none border-2 font-black">
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
      <div className="border-manga-black bg-manga-paper border-3">
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
          <MangaButton
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
          </MangaButton>
        }
      />
      <SheetContent className="border-manga-black bg-manga-paper w-[min(92vw,520px)] border-l-3">
        <SheetHeader className="border-manga-black border-b-3">
          <SheetTitle className="font-sans text-2xl font-black uppercase">
            Full transcript
          </SheetTitle>
          <SheetDescription className="text-manga-ink-soft font-semibold">
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
