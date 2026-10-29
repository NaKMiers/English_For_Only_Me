'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ExamButton, segmentClass } from '@/components/ielts/ui'
import { IELTS_TRACKS, type IeltsTrack } from '@/modules/ielts/constants'

import { AreaField, BandField, ListField, TextField } from './fields'

export interface TestMeta {
  title: string
  series: string
  track: IeltsTrack
  targetBand: number
  tags: string[]
  description: string
}

interface Props {
  busy: boolean
  meta: TestMeta
  onChange: (meta: TestMeta) => void
  onOpenChange: (open: boolean) => void
  onSave: () => void
  open: boolean
  /** Series names other tests already use. */
  seriesOptions: string[]
}

/** Title, series, track, band, tags and description. */
export function TestDetailsDialog({
  busy,
  meta,
  onChange,
  onOpenChange,
  onSave,
  open,
  seriesOptions,
}: Props) {
  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Test details</DialogTitle>
          <DialogDescription>
            Shown on the learner catalogue card.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-3">
          <TextField
            label="Test title"
            onChange={title => onChange({ ...meta, title })}
            value={meta.title}
          />
          <div className="grid gap-1">
            <TextField
              label="Series"
              onChange={series => onChange({ ...meta, series })}
              placeholder="IELTS 21"
              suggestions={seriesOptions}
              value={meta.series}
            />
            <p className="text-muted-foreground text-xs">
              Groups tests on the IELTS page. Pick an existing one to keep them
              together; leave empty to group by the title.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1">
              <span className="font-sans text-xs font-black">Track</span>
              <div className="flex gap-1.5">
                {IELTS_TRACKS.map(track => (
                  // Segmented toggle (aria-pressed): documented raw exception.
                  <button
                    aria-pressed={meta.track === track}
                    className={segmentClass(
                      meta.track === track,
                      'min-h-10 flex-1 px-2'
                    )}
                    key={track}
                    onClick={() => onChange({ ...meta, track })}
                    type="button"
                  >
                    {track === 'academic' ? 'Academic' : 'General'}
                  </button>
                ))}
              </div>
            </div>
            <BandField
              onChange={targetBand => onChange({ ...meta, targetBand })}
              value={meta.targetBand}
            />
          </div>
          <ListField
            label="Tags"
            onChange={tags => onChange({ ...meta, tags })}
            separator=","
            value={meta.tags}
          />
          <AreaField
            label="Description"
            onChange={description => onChange({ ...meta, description })}
            rows={3}
            value={meta.description}
          />
        </div>
        <DialogFooter>
          <ExamButton
            onClick={() => onOpenChange(false)}
            tone="paper"
            type="button"
          >
            Cancel
          </ExamButton>
          <ExamButton
            disabled={busy}
            onClick={onSave}
            tone="ink"
            type="button"
          >
            {busy ? 'Saving...' : 'Save details'}
          </ExamButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
