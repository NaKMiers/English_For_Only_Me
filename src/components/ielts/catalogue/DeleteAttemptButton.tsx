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
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { deleteIeltsAttemptApi, ieltsErrorMessage } from '@/requests/ieltsApi'
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
  const messages = useMessages()
  const t = messages.ielts.deleteAttempt
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
      setError(ieltsErrorMessage(caught, t.failed))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Row action opening a confirm: a plain icon button by design. */}
      <button
        aria-label={format(t.label, { name: label })}
        className="text-ink-soft hover:text-danger hover:bg-danger-soft rounded-tag grid size-8 place-items-center transition-colors"
        onClick={() => setOpen(true)}
        title={t.title}
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
            <DialogTitle>{t.dialogTitle}</DialogTitle>
            <DialogDescription>
              {format(t.dialogBody, { name: label })}
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p
              className="text-danger text-sm font-semibold"
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
              {t.keep}
            </ExamButton>
            <ExamButton
              disabled={busy}
              onClick={() => void remove()}
              tone="danger"
              type="button"
            >
              {busy ? t.deleting : messages.common.actions.delete}
            </ExamButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
