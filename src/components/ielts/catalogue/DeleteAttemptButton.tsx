'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deleteIeltsAttemptApi } from '@/requests/ieltsApi'
import { ExamButton } from '@/components/ielts/ui'

/**
 * Deletes one attempt after a confirm. The page re-reads afterwards, so the
 * band estimate, weak spots and history drop the attempt straight away.
 */
export function DeleteAttemptButton({
  attemptId,
  label,
}: {
  attemptId: string
  /** What the attempt is, e.g. "IELTS 21 Test 1 · Listening". */
  label: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    setBusy(true)
    setError('')

    try {
      await deleteIeltsAttemptApi(attemptId)
      setOpen(false)
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not delete it.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Row action opening a confirm: a plain icon button by design. */}
      <button
        aria-label={`Delete attempt: ${label}`}
        className="text-manga-ink-soft hover:text-manga-red hover:bg-manga-pale-red rounded-tag grid size-8 place-items-center transition-colors"
        onClick={() => setOpen(true)}
        title="Delete attempt"
        type="button"
      >
        <Trash2
          aria-hidden="true"
          className="size-4"
        />
      </button>
      <Dialog
        onOpenChange={next => (busy ? null : setOpen(next))}
        open={open}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this attempt?</DialogTitle>
            <DialogDescription>
              {label}: its answers, score and writing feedback are deleted for
              good, and your band estimate and weak spots are recalculated
              without it.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p
              className="text-manga-red text-sm font-semibold"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <ExamButton
              disabled={busy}
              onClick={() => setOpen(false)}
              tone="paper"
              type="button"
            >
              Keep it
            </ExamButton>
            <ExamButton
              disabled={busy}
              onClick={() => void remove()}
              tone="danger"
              type="button"
            >
              {busy ? 'Deleting...' : 'Delete'}
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
