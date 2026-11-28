'use client'

import {
  Archive,
  ArchiveRestore,
  BookOpen,
  CircleAlert,
  CircleCheck,
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

import { AdminMenuTrigger } from '@/components/admin/AdminMenuTrigger'
import { ExamButton } from '@/components/ielts/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { IeltsConsistencyReport } from '@/modules/ielts/consistency/checkTest'
import type { IeltsAdminTest } from '@/modules/ielts/tests/testService'

import { MetaChip } from './fields'

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
  onOpenVocab: () => void
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
  onOpenVocab,
  onPublish,
  onStop,
  onUnarchive,
  pendingCount,
  picker,
  report,
  test,
}: Props) {
  const t = useMessages()
  const copy = t.ieltsEditor.header
  const actions = t.ieltsEditor.actions
  const errors = report.errors.length
  const warnings = report.warnings.length
  const generating = Boolean(busy?.startsWith('gen:'))
  const errorCount = plural(t.ieltsEditor.counts.error, errors)
  const warningCount = plural(t.ieltsEditor.counts.warning, warnings)

  return (
    <header className="border-line bg-surface rounded-panel flex min-w-0 shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border px-3 py-2">
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-baseline gap-1">
          <nav
            aria-label={copy.breadcrumb}
            className="text-muted-foreground flex shrink-0 items-center gap-1 font-sans text-xs font-semibold"
          >
            <Link
              className="hover:text-ink underline-offset-2 hover:underline"
              href="/admin"
            >
              {t.common.auth.admin}
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              className="hover:text-ink underline-offset-2 hover:underline"
              href="/admin/ielts"
            >
              IELTS
            </Link>
            <span aria-hidden="true">/</span>
          </nav>
          <h1
            className="min-w-0 truncate font-sans text-lg leading-tight font-semibold"
            title={test.slug}
          >
            {test.title || copy.untitled}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <MetaChip tone={STATUS_TONES[test.status]}>
            {t.ieltsEditor.status[test.status]}
          </MetaChip>
          <MetaChip>{t.ieltsEditor.tracks[test.track]}</MetaChip>
          {test.series ? <MetaChip>{test.series}</MetaChip> : null}
          <MetaChip>
            {format(t.ieltsEditor.fields.band, {
              band: test.targetBand.toFixed(1),
            })}
          </MetaChip>
          <MetaChip>{t.ieltsEditor.sources[test.source]}</MetaChip>
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
              {copy.stop}
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
              title={copy.generateMissingTitle}
              tone="ink"
              type="button"
            >
              {format(copy.missing, { count: pendingCount })}
            </ExamButton>
          )
        ) : null}
        {/* Opens the full check report: plain button styled as a chip. */}
        <button
          aria-label={format(copy.checksLabel, {
            errors: errorCount,
            warnings: warningCount,
          })}
          className={cn(
            'border-line rounded-control soft-press inline-flex min-h-9 items-center gap-2 border px-2.5 font-sans text-xs font-semibold tabular-nums',
            errors
              ? 'bg-brand text-surface'
              : warnings
                ? 'bg-yellow-100 text-yellow-950'
                : 'bg-sky-100 text-sky-950'
          )}
          onClick={onOpenChecks}
          title={format(copy.checksTitle, {
            errors: errorCount,
            warnings: warningCount,
          })}
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
              {copy.allClear}
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
            title={errors ? copy.fixErrorsFirst : undefined}
            tone="ink"
            type="button"
          >
            {busy === 'publish' ? actions.publishing : actions.publish}
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
            {busy === 'unarchive' ? actions.publishing : actions.publishAgain}
          </ExamButton>
        ) : null}
        <DropdownMenu>
          <AdminMenuTrigger
            disabled={busy !== null && !generating}
            label={copy.moreActions}
            title={copy.more}
          />
          <DropdownMenuContent
            align="end"
            className="w-56"
          >
            <DropdownMenuItem onClick={onEditDetails}>
              <Pencil aria-hidden="true" />
              {copy.editDetails}
            </DropdownMenuItem>
            {test.status === 'published' ? (
              <DropdownMenuItem render={<Link href={`/ielts/${test.slug}`} />}>
                <Eye aria-hidden="true" />
                {actions.viewAsLearner}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onOpenVocab}>
              <BookOpen aria-hidden="true" />
              {copy.vocabulary}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenLog}>
              <ScrollText aria-hidden="true" />
              {format(copy.aiLog, { count: test.generationLog.length })}
            </DropdownMenuItem>
            {test.status === 'published' ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={generating}
                  onClick={onArchive}
                >
                  <Archive aria-hidden="true" />
                  {actions.archive}
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
                  {actions.deleteTest}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
