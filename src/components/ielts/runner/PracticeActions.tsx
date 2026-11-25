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
  return (
    <ExamButton
      className={cn(
        'h-9 min-h-9 border-2 px-3 shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:not-aria-[haspopup]:translate-y-[2px]',
        className
      )}
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
      {busy ? 'Checking...' : label}
      {score && !busy ? (
        <span className="rounded-tag bg-manga-white/20 ml-2 px-1.5 text-xs tabular-nums">
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
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconButton
        className="rounded-tag size-9 border-2 shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:not-aria-[haspopup]:translate-y-[2px]"
        disabled={disabled}
        label={`Reset ${name}`}
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
            <DialogTitle>Reset {name}?</DialogTitle>
            <DialogDescription>
              Every answer in {name} is cleared. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <ExamButton
              onClick={() => setOpen(false)}
              tone="paper"
              type="button"
            >
              Keep answers
            </ExamButton>
            <ExamButton
              onClick={() => {
                setOpen(false)
                onReset()
              }}
              tone="danger"
              type="button"
            >
              Reset {name}
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
