'use client'

import { ListChecks, LoaderCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IconButton } from '@/components/ui/IconButton'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'

import { ExamButton } from '../ui'

/**
 * Practice "check": scores the part on screen (Listening, Reading) or asks
 * the AI examiner about the task (Writing) without submitting. Shows the
 * last score beside the label once checked.
 */
export function CheckButton({
  busy,
  className,
  label,
  onCheck,
  score = null,
}: {
  busy: boolean
  className?: string
  label: string
  onCheck: () => void
  /** "7/10" for a part, "Band 6.5" for a task. */
  score?: string | null
}) {
  const t = useMessages().ielts.check

  return (
    <ExamButton
      className={cn('h-9 min-h-9 border px-3', className)}
      disabled={busy}
      icon={
        busy ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin"
          />
        ) : (
          <ListChecks
            aria-hidden="true"
            className="size-4"
          />
        )
      }
      onClick={onCheck}
      tone="ink"
      type="button"
    >
      {busy ? t.checking : label}
      {score && !busy ? (
        <span className="rounded-tag bg-surface/20 ml-2 px-1.5 text-xs tabular-nums">
          {score}
        </span>
      ) : null}
    </ExamButton>
  )
}

/**
 * Toolbar reset for the part (or task) on screen: a small icon key that asks
 * first, then clears every answer in that part.
 */
export function ResetPartButton({
  disabled = false,
  name,
  onReset,
}: {
  disabled?: boolean
  /** "Part 1", "Passage 2", "Task 1". */
  name: string
  onReset: () => void
}) {
  const t = useMessages().ielts.reset
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconButton
        className="border"
        disabled={disabled}
        label={format(t.label, { name })}
        onClick={() => setOpen(true)}
        type="button"
      >
        <RotateCcw
          aria-hidden="true"
          className="size-4"
        />
      </IconButton>
      <Dialog
        onOpenChange={setOpen}
        open={open}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{format(t.title, { name })}</DialogTitle>
            <DialogDescription>{format(t.body, { name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setOpen(false)}
              tone="paper"
              type="button"
            >
              {t.keep}
            </ExamButton>
            <ExamButton
              onClick={() => {
                setOpen(false)
                onReset()
              }}
              tone="danger"
              type="button"
            >
              {format(t.confirm, { name })}
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
