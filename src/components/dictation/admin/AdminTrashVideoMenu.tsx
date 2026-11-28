'use client'

import { RotateCcw, Trash2 } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { AdminMenuTrigger } from '@/components/admin/AdminMenuTrigger'
import { format } from '@/i18n/format'
import { useMessages } from '@/i18n/client'
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
  const t = useMessages()

  return (
    <DropdownMenu>
      <AdminMenuTrigger
        label={format(t.admin.menu.triggerFor, { title })}
        title={t.admin.menu.trigger}
      />
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
            {t.admin.trash.restore}
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
            confirmTitle={t.admin.trash.purgeTitle}
            confirmMessage={format(t.admin.trash.purgeMessage, { title })}
            confirmLabel={t.admin.trash.purge}
            className="focus:bg-brand focus:text-surface text-brand hover:bg-brand hover:text-surface rounded-tag flex min-h-11 w-full items-center gap-2 px-3 font-sans text-sm font-semibold whitespace-nowrap transition-colors"
          >
            <Trash2
              aria-hidden="true"
              className="size-4"
            />
            {t.admin.trash.purge}
          </ConfirmSubmitButton>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
