'use client'

import type { ReactNode } from 'react'

import { ActionButton } from '@/components/ui/ActionButton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  cancelLabel: string
  confirmLabel: string
  /** Rendered icon for the confirm button. */
  confirmIcon?: ReactNode
  description?: ReactNode
  /** A link instead of a callback, e.g. "leave" back to the path. */
  confirmHref?: string
  onConfirm?: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

/**
 * The leave / submit / restart confirmation: a title, one line, "keep going"
 * as the quiet button and the confirm as the one `ink` button.
 */
export function ConfirmDialog({
  cancelLabel,
  confirmHref,
  confirmIcon,
  confirmLabel,
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
}: Props) {
  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="border-line bg-surface border">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-medium">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter className="bg-surface border-line border-t">
          <ActionButton
            onClick={() => onOpenChange(false)}
            tone="paper"
          >
            {cancelLabel}
          </ActionButton>
          {confirmHref ? (
            <ActionButton
              href={confirmHref}
              icon={confirmIcon}
              tone="ink"
            >
              {confirmLabel}
            </ActionButton>
          ) : (
            <ActionButton
              icon={confirmIcon}
              onClick={() => {
                onConfirm?.()
                onOpenChange(false)
              }}
              tone="ink"
            >
              {confirmLabel}
            </ActionButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
