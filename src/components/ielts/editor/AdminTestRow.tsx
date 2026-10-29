'use client'

import {
  Archive,
  ArchiveRestore,
  Eye,
  EllipsisVertical,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { IeltsTestStatus } from '@/modules/ielts/constants'
import {
  archiveIeltsTestApi,
  deleteIeltsTestApi,
  IeltsAdminApiError,
  publishIeltsTestApi,
  unarchiveIeltsTestApi,
} from '@/requests/ieltsAdminApi'

export interface AdminTestRowItem {
  detail: string
  id: string
  progress: string
  slug: string
  status: IeltsTestStatus
  title: string
}

/**
 * One test in the admin list: the row opens the editor, the ⋮ menu runs the
 * quick actions for its status (publish or delete a draft; view or archive a
 * published test; publish again or delete an archived one) without opening it.
 */
export function AdminTestRow({ row }: { row: AdminTestRowItem }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const editHref = `/admin/ielts/${row.id}`

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')

    try {
      await action()
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Something went wrong.'
      )
    } finally {
      setBusy(false)
    }
  }

  const publish = () =>
    run(async () => {
      try {
        await publishIeltsTestApi(row.id)
      } catch (caught) {
        const report =
          caught instanceof IeltsAdminApiError ? caught.report : null

        // Only warnings left: the editor asks before publishing, so do we.
        if (
          !report ||
          report.errors.length > 0 ||
          !window.confirm(
            `${report.warnings.length} warnings left. Publish anyway?`
          )
        )
          throw caught

        await publishIeltsTestApi(row.id, true)
      }

      router.refresh()
    })

  const archive = () =>
    run(async () => {
      await archiveIeltsTestApi(row.id)
      router.refresh()
    })

  const unarchive = () =>
    run(async () => {
      await unarchiveIeltsTestApi(row.id)
      router.refresh()
    })

  const remove = () => {
    if (!window.confirm("Delete this test? This can't be undone.")) return

    void run(async () => {
      try {
        await deleteIeltsTestApi(row.id)
      } catch (caught) {
        const count =
          caught instanceof IeltsAdminApiError ? caught.attemptCount : null

        // Old reviews read this test: deleting it takes them along.
        if (
          !count ||
          !window.confirm(
            `${count} attempts use this test and will be deleted with it (reviews included). Delete anyway?`
          )
        )
          throw caught

        await deleteIeltsTestApi(row.id, true)
      }

      router.refresh()
    })
  }

  return (
    <li className="grid gap-1">
      <div className="border-manga-black rounded-control bg-manga-white flex min-w-0 items-center gap-2 border-2 py-1 pr-2">
        <Link
          className="hover:bg-manga-pale-red rounded-control grid min-w-0 flex-1 gap-1 px-3 py-1 sm:grid-cols-[1fr_auto] sm:items-center"
          href={editHref}
        >
          <span className="grid min-w-0 gap-0.5">
            <strong className="font-sans font-black wrap-break-word">
              {row.title}
            </strong>
            <span className="text-muted-foreground text-xs font-semibold wrap-break-word">
              {row.detail}
            </span>
          </span>
          <span className="text-xs font-semibold tabular-nums">
            {row.progress}
          </span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${row.title}`}
            className="border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control grid size-9 shrink-0 place-items-center border-2 shadow-[2px_2px_0_var(--manga-black)] transition-colors disabled:opacity-50"
            disabled={busy}
            title="Actions"
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
            <DropdownMenuItem render={<Link href={editHref} />}>
              <Pencil aria-hidden="true" />
              Edit test
            </DropdownMenuItem>
            {row.status === 'draft' ? (
              <DropdownMenuItem onClick={() => void publish()}>
                <Send aria-hidden="true" />
                Publish
              </DropdownMenuItem>
            ) : null}
            {row.status === 'published' ? (
              <DropdownMenuItem render={<Link href={`/ielts/${row.slug}`} />}>
                <Eye aria-hidden="true" />
                View as learner
              </DropdownMenuItem>
            ) : null}
            {row.status === 'published' ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void archive()}>
                  <Archive aria-hidden="true" />
                  Archive
                </DropdownMenuItem>
              </>
            ) : null}
            {row.status === 'published' ? null : (
              <>
                <DropdownMenuSeparator />
                {row.status === 'archived' ? (
                  <DropdownMenuItem onClick={() => void unarchive()}>
                    <ArchiveRestore aria-hidden="true" />
                    Publish again
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={remove}
                  variant="destructive"
                >
                  <Trash2 aria-hidden="true" />
                  Delete test
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {error ? (
        <p
          className="text-manga-red px-1 text-xs font-semibold"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </li>
  )
}
