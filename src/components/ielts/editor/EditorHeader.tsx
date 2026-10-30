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
  /** The section strip, rendered in the middle of the bar. */
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
 * The editor's one compact header bar: breadcrumb, title and chips on the
 * left, the section strip in the middle, then the "generate missing" loop, the
 * check summary, the main action for the status and a ⋮ menu for everything
 * else. It wraps into extra rows on narrow screens.
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

  return (
    <header className="border-manga-black bg-manga-white rounded-panel flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-3 px-3 py-2 shadow-[4px_4px_0_var(--manga-black)]">
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-baseline gap-1">
          <nav
            aria-label="Breadcrumb"
            className="text-muted-foreground flex shrink-0 items-center gap-1 font-sans text-xs font-black"
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
          </nav>
          <h1
            className="min-w-0 truncate font-sans text-lg leading-tight font-black"
            title={test.slug}
          >
            {test.title || 'Untitled test'}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <MetaChip tone={STATUS_TONES[test.status]}>{test.status}</MetaChip>
          <MetaChip>
            {test.track === 'academic' ? 'Academic' : 'General'}
          </MetaChip>
          {test.series ? <MetaChip>{test.series}</MetaChip> : null}
          <MetaChip>Band {test.targetBand.toFixed(1)}</MetaChip>
          <MetaChip>{test.source}</MetaChip>
          {test.tags.length ? (
            <MetaChip
              className="normal-case"
              tone="pale"
            >
              <span title={test.tags.map(tag => `#${tag}`).join(' ')}>
                #{test.tags[0]}
                {test.tags.length > 1 ? ` +${test.tags.length - 1}` : ''}
              </span>
            </MetaChip>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 flex-1">{picker}</div>

      <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
        {pendingCount ? (
          generating ? (
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
              title="Generate every missing section"
              tone="ink"
              type="button"
            >
              Missing ({pendingCount})
            </ExamButton>
          )
        ) : null}
        {/* Opens the full check report: plain button styled as a chip. */}
        <button
          aria-label={`${countLabel(errors, 'error')}, ${countLabel(warnings, 'warning')}`}
          className={cn(
            'border-manga-black rounded-control sticker-press inline-flex min-h-9 items-center gap-2 border-2 px-2.5 font-sans text-xs font-black tabular-nums shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            errors
              ? 'bg-manga-red text-manga-white'
              : warnings
                ? 'bg-yellow-100 text-yellow-950'
                : 'bg-sky-100 text-sky-950'
          )}
          onClick={onOpenChecks}
          title={`${countLabel(errors, 'error')} · ${countLabel(warnings, 'warning')}`}
          type="button"
        >
          {errors || warnings ? (
            <>
              <span className="inline-flex items-center gap-1">
                <CircleAlert
                  aria-hidden="true"
                  className="size-4"
                />
                {errors}
              </span>
              <span className="inline-flex items-center gap-1">
                <TriangleAlert
                  aria-hidden="true"
                  className="size-4"
                />
                {warnings}
              </span>
            </>
          ) : (
            <>
              <CircleCheck
                aria-hidden="true"
                className="size-4"
              />
              All clear
            </>
          )}
        </button>
        {test.status === 'draft' ? (
          <ExamButton
            className="min-h-9"
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
            className="min-h-9"
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
            className="border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control sticker-press grid size-9 shrink-0 place-items-center border-2 shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
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
              <DropdownMenuItem render={<Link href={`/ielts/${test.slug}`} />}>
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
    </header>
  )
}
