'use client'

import { useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * A submit button that opens a confirm modal first. Place inside a <form> whose
 * action is a server action; on confirm it calls form.requestSubmit(). Used for
 * every destructive admin action.
 */
export function ConfirmSubmitButton({
  children,
  confirmTitle = 'Are you sure?',
  confirmMessage,
  confirmLabel = 'Delete',
  className,
  ariaLabel,
}: {
  children: React.ReactNode
  confirmTitle?: string
  confirmMessage: string
  confirmLabel?: string
  className?: string
  ariaLabel?: string
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={confirmTitle}
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="border-manga-black bg-manga-white grid w-full max-w-md gap-4 border-3 p-5 shadow-[6px_6px_0_var(--manga-black)]"
            onClick={event => event.stopPropagation()}
          >
            <h2 className="font-sans text-lg font-black uppercase">
              {confirmTitle}
            </h2>
            <p className="text-manga-ink-soft text-sm leading-6">
              {confirmMessage}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="border-manga-black bg-manga-white hover:bg-manga-paper-soft inline-flex min-h-11 items-center border-3 px-4 font-sans text-sm font-black shadow-[3px_3px_0_var(--manga-black)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  ref.current?.form?.requestSubmit()
                }}
                className={cn(
                  'border-manga-black bg-manga-red text-manga-white hover:bg-manga-pale-red hover:text-manga-black inline-flex min-h-11 items-center border-3 px-4 font-sans text-sm font-black shadow-[3px_3px_0_var(--manga-black)]'
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
