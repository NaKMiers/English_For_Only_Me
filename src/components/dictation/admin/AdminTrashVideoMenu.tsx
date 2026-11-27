'use client'

import { EllipsisVertical, RotateCcw, Trash2 } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  purgeVideoAction,
  restoreVideoAction,
} from '@/modules/dictation/content/adminActions'

import { ConfirmSubmitButton } from './ConfirmSubmitButton'

/** Restore / Delete permanently for one trashed video, in the row's ⋯ menu. */
export function AdminTrashVideoMenu({
  id,
  title,
}: {
  id: string
  title: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${title}`}
        title="Actions"
        className="border-line bg-surface hover:bg-tint rounded-control grid size-9 shrink-0 place-items-center border transition-colors"
      >
        <EllipsisVertical
          aria-hidden="true"
          className="size-4"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52"
      >
        <form action={restoreVideoAction}>
          <input
            type="hidden"
            name="id"
            value={id}
          />
          <DropdownMenuItem
            render={<button type="submit" />}
            nativeButton
            className="w-full"
          >
            <RotateCcw aria-hidden="true" />
            Restore
          </DropdownMenuItem>
        </form>
        <DropdownMenuSeparator />
        <form action={purgeVideoAction}>
          <input
            type="hidden"
            name="id"
            value={id}
          />
          <ConfirmSubmitButton
            confirmTitle="Delete permanently?"
            confirmMessage={`Delete "${title}" for good? Its transcripts, segments and every learner's practice history for it are removed too. This cannot be undone.`}
            confirmLabel="Delete permanently"
            className="focus:bg-brand focus:text-surface text-brand hover:bg-brand hover:text-surface rounded-tag flex min-h-11 w-full items-center gap-2 px-3 font-sans text-sm font-semibold whitespace-nowrap transition-colors"
          >
            <Trash2
              aria-hidden="true"
              className="size-4"
            />
            Delete permanently
          </ConfirmSubmitButton>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
