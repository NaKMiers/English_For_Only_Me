'use client'

import {
  Archive,
  ArchiveRestore,
  CircleAlert,
  CircleCheck,
  EllipsisVertical,
  Eye,
  Pencil,
  ScrollText,
  Send,
  Square,
  Trash2,
  TriangleAlert,
  WandSparkles,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ExamButton } from '@/components/ielts/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { IeltsConsistencyReport } from '@/modules/ielts/consistency/checkTest'
import type { IeltsAdminTest } from '@/modules/ielts/tests/testService'

import { countLabel, MetaChip } from './fields'

const STATUS_TONES = {
  draft: 'warn',
  published: 'ok',
  archived: 'default',
} as const

interface Props {
  busy: string | null
  /** The section strip, rendered as the header's second row. */
  picker: ReactNode
  onArchive: () => void
  onDelete: () => void
  onEditDetails: () => void
  onGenerateMissing: () => void
  onOpenChecks: () => void
  onOpenLog: () => void
  onPublish: () => void
  onStop: () => void
  onUnarchive: () => void
  pendingCount: number
  report: IeltsConsistencyReport
  test: IeltsAdminTest
}

/**
 * The editor's one header card. Row one: breadcrumb, title and chips on the
 * left; the check summary, the main action for the status and a ⋮ menu for
 * everything else on the right. Row two: the section strip and the "generate
 * missing" loop.
 */
export function EditorHeader({
  busy,
  onArchive,
  onDelete,
  onEditDetails,
  onGenerateMissing,
  onOpenChecks,
  onOpenLog,
  onPublish,
  onStop,
  onUnarchive,
  pendingCount,
  picker,
  report,
  test,
}: Props) {
  const errors = report.errors.length
  const warnings = report.warnings.length
  const generating = Boolean(busy?.startsWith('gen:'))
  const ChecksIcon = errors
    ? CircleAlert
    : warnings
      ? TriangleAlert
      : CircleCheck

  return (
    <header className="border-manga-black bg-manga-white rounded-panel grid min-w-0 shrink-0 border-3 shadow-[4px_4px_0_var(--manga-black)]">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 p-3 sm:px-4">
        <div className="grid min-w-0 gap-1.5">
          <nav
            aria-label="Breadcrumb"
            className="text-muted-foreground flex items-center gap-1 font-sans text-xs font-black"
          >
            <Link
              className="hover:text-manga-black underline-offset-2 hover:underline"
              href="/admin"
            >
              Admin
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              className="hover:text-manga-black underline-offset-2 hover:underline"
              href="/admin/ielts"
            >
              IELTS
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{test.slug}</span>
          </nav>
          <h1 className="font-sans text-xl leading-tight font-black wrap-break-word sm:text-2xl">
            {test.title || 'Untitled test'}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <MetaChip tone={STATUS_TONES[test.status]}>{test.status}</MetaChip>
            <MetaChip>
              {test.track === 'academic' ? 'Academic' : 'General'}
            </MetaChip>
            {test.series ? <MetaChip>{test.series}</MetaChip> : null}
            <MetaChip>Band {test.targetBand.toFixed(1)}</MetaChip>
            <MetaChip>{test.source}</MetaChip>
            {test.tags.slice(0, 3).map(tag => (
              <MetaChip
                className="normal-case"
                key={tag}
                tone="pale"
              >
                #{tag}
              </MetaChip>
            ))}
            {test.tags.length > 3 ? (
              <span className="text-muted-foreground text-xs font-black">
                +{test.tags.length - 3}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Opens the full check report: plain button styled as a chip. */}
          <button
            className={cn(
              'border-manga-black rounded-control sticker-press inline-flex min-h-10 items-center gap-1.5 border-2 px-2.5 font-sans text-xs font-black tabular-nums shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
              errors
                ? 'bg-manga-red text-manga-white'
                : warnings
                  ? 'bg-yellow-100 text-yellow-950'
                  : 'bg-sky-100 text-sky-950'
            )}
            onClick={onOpenChecks}
            type="button"
          >
            <ChecksIcon
              aria-hidden="true"
              className="size-4"
            />
            {countLabel(errors, 'error')} · {countLabel(warnings, 'warning')}
          </button>
          {test.status === 'draft' ? (
            <ExamButton
              className="min-h-10"
              disabled={busy !== null || errors > 0}
              icon={
                <Send
                  aria-hidden="true"
                  className="size-4"
                />
              }
              onClick={onPublish}
              title={errors ? 'Fix the errors first' : undefined}
              tone="ink"
              type="button"
            >
              {busy === 'publish' ? 'Publishing...' : 'Publish'}
            </ExamButton>
          ) : test.status === 'archived' ? (
            <ExamButton
              className="min-h-10"
              disabled={busy !== null}
              icon={
                <ArchiveRestore
                  aria-hidden="true"
                  className="size-4"
                />
              }
              onClick={onUnarchive}
              tone="ink"
              type="button"
            >
              {busy === 'unarchive' ? 'Publishing...' : 'Publish again'}
            </ExamButton>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="More test actions"
              className="border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control sticker-press grid size-10 shrink-0 place-items-center border-2 shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
              disabled={busy !== null && !generating}
              title="More"
            >
              <EllipsisVertical
                aria-hidden="true"
                className="size-4"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56"
            >
              <DropdownMenuItem onClick={onEditDetails}>
                <Pencil aria-hidden="true" />
                Edit details
              </DropdownMenuItem>
              {test.status === 'published' ? (
                <DropdownMenuItem
                  render={<Link href={`/ielts/${test.slug}`} />}
                >
                  <Eye aria-hidden="true" />
                  View as learner
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={onOpenLog}>
                <ScrollText aria-hidden="true" />
                AI log ({test.generationLog.length})
              </DropdownMenuItem>
              {test.status === 'published' ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={generating}
                    onClick={onArchive}
                  >
                    <Archive aria-hidden="true" />
                    Archive
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={generating}
                    onClick={onDelete}
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
      </div>

      <div className="border-manga-black/40 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 border-t-2 border-dashed px-3 py-2.5 sm:px-4">
        <div className="min-w-0 flex-1">{picker}</div>
        {pendingCount ? (
          // Its own full-width row on a phone, beside the strip from 640px.
          <div className="flex shrink-0 max-sm:w-full [&>*]:max-sm:flex-1">
            {generating ? (
              <ExamButton
                className="min-h-9 px-3"
                icon={
                  <Square
                    aria-hidden="true"
                    className="size-3.5"
                  />
                }
                onClick={onStop}
                tone="paper"
                type="button"
              >
                Stop
              </ExamButton>
            ) : (
              <ExamButton
                className="min-h-9 px-3"
                disabled={busy !== null}
                icon={
                  <WandSparkles
                    aria-hidden="true"
                    className="size-4"
                  />
                }
                onClick={onGenerateMissing}
                tone="ink"
                type="button"
              >
                Generate missing ({pendingCount})
              </ExamButton>
            )}
          </div>
        ) : null}
      </div>
    </header>
  )
}
