'use client'

import { useRef, useState } from 'react'

import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'

/**
 * A submit button that opens a confirm modal first. Place inside a <form> whose
 * action is a server action; on confirm it calls form.requestSubmit(). Used for
 * every destructive admin action.
 */
export function ConfirmSubmitButton({
  children,
  confirmTitle: confirmTitleProp,
  confirmMessage,
  confirmLabel: confirmLabelProp,
  className,
  ariaLabel,
  disabled = false,
  disabledReason,
}: {
  children: React.ReactNode
  confirmTitle?: string
  confirmMessage: string
  confirmLabel?: string
  className?: string
  ariaLabel?: string
  disabled?: boolean
  disabledReason?: string
}) {
  const t = useMessages()
  const confirmTitle = confirmTitleProp ?? t.admin.confirm.defaultTitle
  const confirmLabel = confirmLabelProp ?? t.common.actions.delete
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        title={disabled ? disabledReason : undefined}
        disabled={disabled}
        className={cn(className, disabled && 'cursor-not-allowed opacity-50')}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={confirmTitle}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="border-line bg-surface rounded-panel grid w-full max-w-md gap-4 border p-5"
            onClick={event => event.stopPropagation()}
          >
            <h2 className="font-sans text-lg font-semibold">{confirmTitle}</h2>
            <p className="text-ink-soft text-sm leading-6">{confirmMessage}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border-line bg-surface hover:bg-tint rounded-control inline-flex min-h-11 items-center border px-4 font-sans text-sm font-semibold"
              >
                {t.common.actions.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  ref.current?.form?.requestSubmit()
                }}
                className={cn(
                  'border-line bg-brand text-surface hover:bg-tint-soft hover:text-ink rounded-control inline-flex min-h-11 items-center border px-4 font-sans text-sm font-semibold'
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
