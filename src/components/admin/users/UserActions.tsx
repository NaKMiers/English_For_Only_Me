'use client'

import { Lock, LockOpen, ShieldAlert, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { InlineNotice } from '@/components/common/InlineNotice'
import { ActionButton } from '@/components/ui/ActionButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import {
  deleteUserAction,
  setUserLockedAction,
  type UserActionState,
} from '@/modules/admin/users/userAdminActions'
import {
  deleteConfirmationMatches,
  type AdminUserRow,
  type UserManagementBlock,
} from '@/modules/admin/users/userDirectory'

interface Props {
  /** Why this admin may not manage the account, or null when they may. */
  block: UserManagementBlock | null
  user: Pick<AdminUserRow, 'email' | 'id' | 'name' | 'status'>
}

/**
 * The account's danger zone: lock / unlock behind a confirm, and delete
 * behind a dialog that wants the email typed back. Your own account and
 * ADMIN_EMAILS admins only get the reason they cannot be touched.
 */
export function UserActions({ block, user }: Props) {
  const t = useMessages()
  const text = t.admin.users.detail
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [lockOpen, setLockOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState<{
    tone: 'error' | 'info'
    text: string
  } | null>(null)
  const name = user.name || user.email
  const locked = user.status === 'locked'

  if (block)
    return (
      <InlineNotice tone="info">
        {block === 'self' ? text.protectedSelf : text.protectedAdmin}
      </InlineNotice>
    )

  function run(
    action: () => Promise<UserActionState>,
    onDone: () => void,
    successText?: string
  ) {
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await action()

        if (!result.ok) {
          setFeedback({ tone: 'error', text: result.message })

          return
        }

        onDone()
        if (successText) setFeedback({ tone: 'info', text: successText })
      } catch {
        setFeedback({ tone: 'error', text: t.admin.users.errors.failed })
      }
    })
  }

  function toggleLock() {
    setLockOpen(false)
    run(
      () => setUserLockedAction(user.id, !locked),
      () => router.refresh(),
      locked ? text.unlocked : text.locked
    )
  }

  function deleteForGood() {
    run(
      () => deleteUserAction(user.id, typed),
      () => {
        setDeleteOpen(false)
        router.replace('/admin/users')
        router.refresh()
      }
    )
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border-line rounded-panel grid content-between gap-4 border p-4">
          <div className="grid gap-1">
            <span className="text-ink font-medium">
              {locked ? text.unlock : text.lock}
            </span>
            <span className="text-ink-soft text-sm">
              {locked ? text.unlockHint : text.lockHint}
            </span>
          </div>
          <ActionButton
            className="justify-self-start"
            disabled={pending}
            icon={
              locked ? (
                <LockOpen
                  aria-hidden="true"
                  className="size-4"
                />
              ) : (
                <Lock
                  aria-hidden="true"
                  className="size-4"
                />
              )
            }
            onClick={() => setLockOpen(true)}
            tone="paper"
          >
            {locked ? text.unlock : text.lock}
          </ActionButton>
        </div>

        <div className="border-danger/30 bg-danger-soft/40 rounded-panel grid content-between gap-4 border p-4">
          <div className="grid gap-1">
            <span className="text-danger flex items-center gap-1.5 font-medium">
              <ShieldAlert
                aria-hidden="true"
                className="size-4"
              />
              {text.delete}
            </span>
            <span className="text-ink-soft text-sm">{text.deleteHint}</span>
          </div>
          <ActionButton
            className="border-danger/40 text-danger hover:bg-danger hover:text-surface justify-self-start"
            disabled={pending}
            icon={
              <Trash2
                aria-hidden="true"
                className="size-4"
              />
            }
            onClick={() => {
              setTyped('')
              setFeedback(null)
              setDeleteOpen(true)
            }}
            tone="paper"
          >
            {text.delete}
          </ActionButton>
        </div>
      </div>

      {feedback && !deleteOpen ? (
        <InlineNotice tone={feedback.tone}>{feedback.text}</InlineNotice>
      ) : null}

      <ConfirmDialog
        cancelLabel={t.common.actions.cancel}
        confirmLabel={locked ? text.unlock : text.lock}
        description={locked ? text.unlockDescription : text.lockDescription}
        onConfirm={toggleLock}
        onOpenChange={setLockOpen}
        open={lockOpen}
        title={format(locked ? text.unlockTitle : text.lockTitle, { name })}
      />

      <Dialog
        onOpenChange={open => {
          if (!pending) setDeleteOpen(open)
        }}
        open={deleteOpen}
      >
        <DialogContent className="border-line bg-surface border">
          <DialogHeader>
            <DialogTitle className="font-sans text-lg font-medium">
              {format(text.deleteTitle, { name })}
            </DialogTitle>
            <DialogDescription>{text.deleteDescription}</DialogDescription>
          </DialogHeader>
          <label className="grid gap-2 px-4 pb-2 sm:px-6">
            <span className="text-ink text-sm">
              {format(text.deleteConfirmLabel, { email: user.email })}
            </span>
            <Input
              autoComplete="off"
              className="h-11"
              onChange={event => setTyped(event.target.value)}
              spellCheck={false}
              value={typed}
            />
          </label>
          {feedback?.tone === 'error' ? (
            <InlineNotice
              className="mx-4 sm:mx-6"
              tone="error"
            >
              {feedback.text}
            </InlineNotice>
          ) : null}
          <DialogFooter className="bg-surface border-line border-t">
            <ActionButton
              disabled={pending}
              onClick={() => setDeleteOpen(false)}
              tone="paper"
            >
              {t.common.actions.cancel}
            </ActionButton>
            <ActionButton
              className="bg-danger border-danger text-surface hover:bg-danger/85"
              disabled={
                pending || !deleteConfirmationMatches(user.email, typed)
              }
              icon={
                <Trash2
                  aria-hidden="true"
                  className="size-4"
                />
              }
              onClick={deleteForGood}
              tone="ink"
            >
              {text.deleteConfirm}
            </ActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
