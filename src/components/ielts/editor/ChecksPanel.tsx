'use client'

import { ArrowRight } from 'lucide-react'
import { useState } from 'react'

import { segmentClass } from '@/components/ielts/ui'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type {
  IeltsConsistencyIssue,
  IeltsConsistencyReport,
} from '@/modules/ielts/consistency/checkTest'

import { PageControls } from './fields'

const PAGE_SIZE = 8

/**
 * One issue row. With `onJump` the row is a button that opens the section
 * the issue belongs to.
 */
function IssueRow({
  issue,
  onJump,
}: {
  issue: IeltsConsistencyIssue
  onJump?: (sectionKey: string) => void
}) {
  const t = useMessages()
  const body = (
    <>
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <code className="font-sans text-xs font-semibold">{issue.rule}</code>
        <span className="text-muted-foreground text-xs">{issue.path}</span>
      </span>
      <span className="text-sm">
        {format(t.ieltsEditor.issues[issue.code], issue.values)}
      </span>
    </>
  )

  if (!onJump || !issue.sectionKey)
    return <li className="grid gap-0.5 px-2 py-1.5">{body}</li>

  return (
    <li>
      {/* Row link to a section in this client view: plain button row. */}
      <button
        className="hover:bg-tint-soft rounded-tag group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 text-left"
        onClick={() => onJump(issue.sectionKey)}
        type="button"
      >
        <span className="grid min-w-0 gap-0.5">{body}</span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 opacity-40 group-hover:opacity-100"
        />
      </button>
    </li>
  )
}

/** A paged list of issues (the publish-with-warnings dialog uses it bare). */
export function IssueList({
  issues,
  onJump,
}: {
  issues: IeltsConsistencyIssue[]
  onJump?: (sectionKey: string) => void
}) {
  const t = useMessages()
  const [page, setPage] = useState(0)

  if (!issues.length) return null

  // The list can shrink under the pager after a fix.
  const safePage = Math.min(page, Math.ceil(issues.length / PAGE_SIZE) - 1)

  return (
    <div className="grid gap-2">
      <ul className="divide-line/15 grid divide-y">
        {issues
          .slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
          .map((issue, index) => (
            <IssueRow
              issue={issue}
              key={`${safePage}:${index}`}
              onJump={onJump}
            />
          ))}
      </ul>
      <PageControls
        label={t.ieltsEditor.checks.issues}
        onPageChange={setPage}
        page={safePage}
        pageSize={PAGE_SIZE}
        total={issues.length}
      />
    </div>
  )
}

/** Errors / warnings switch over a consistency report. */
export function ChecksPanel({
  onJump,
  report,
}: {
  onJump?: (sectionKey: string) => void
  report: IeltsConsistencyReport
}) {
  const t = useMessages()
  const copy = t.ieltsEditor.checks
  const [kind, setKind] = useState<'errors' | 'warnings'>(
    report.errors.length || !report.warnings.length ? 'errors' : 'warnings'
  )

  if (!report.errors.length && !report.warnings.length)
    return <p className="text-sm font-semibold">{copy.allPass}</p>

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        {(['errors', 'warnings'] as const).map(value => (
          // Segmented toggle (aria-pressed): documented raw exception.
          <button
            aria-pressed={kind === value}
            className={segmentClass(kind === value, 'capitalize')}
            key={value}
            onClick={() => setKind(value)}
            type="button"
          >
            {format(copy[value], { count: report[value].length })}
          </button>
        ))}
      </div>
      <IssueList
        issues={report[kind]}
        key={kind}
        onJump={onJump}
      />
      {report[kind].length ? null : (
        <p className="text-muted-foreground text-sm font-semibold">
          {kind === 'errors' ? copy.noErrors : copy.noWarnings}
        </p>
      )}
    </div>
  )
}
