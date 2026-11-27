'use client'

import { useState } from 'react'

import { INTL_LOCALES } from '@/i18n/config'
import { useLocale, useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type { IeltsAdminTest } from '@/modules/ielts/tests/testService'

import { MetaChip, PageControls } from './fields'

const PAGE_SIZE = 10

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
}

/**
 * Every AI request on this test, newest first and ten to a page: kind,
 * outcome, tokens, time, failures.
 */
export function GenerationLog({
  rows,
}: {
  rows: IeltsAdminTest['generationLog']
}) {
  const t = useMessages()
  const locale = useLocale()
  const copy = t.ieltsEditor.log
  const [page, setPage] = useState(0)

  if (!rows.length)
    return (
      <p className="text-muted-foreground text-sm font-semibold">
        {copy.empty}
      </p>
    )

  const timeFormat = new Intl.DateTimeFormat(INTL_LOCALES[locale], TIME_FORMAT)

  const newest = [...rows].reverse()
  const visible = newest.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="grid min-w-0 gap-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-line border-b font-sans">
              {[
                copy.when,
                copy.section,
                copy.kind,
                copy.result,
                copy.tokens,
                copy.time,
              ].map(label => (
                <th
                  className="py-1.5 pr-2"
                  key={label}
                  scope="col"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const notes = [row.failedRules.join(', '), row.error]
                .filter(Boolean)
                .join(' ')

              return (
                <tr
                  className="border-line/20 border-b align-top"
                  key={page * PAGE_SIZE + index}
                >
                  <td className="py-1.5 pr-2 tabular-nums">
                    {timeFormat.format(new Date(row.at))}
                  </td>
                  <td className="py-1.5 pr-2 font-bold">{row.sectionKey}</td>
                  <td className="py-1.5 pr-2">{row.kind}</td>
                  <td className="grid gap-1 py-1.5 pr-2">
                    <MetaChip tone={row.outcome === 'ok' ? 'ok' : 'warn'}>
                      {row.outcome}
                    </MetaChip>
                    {notes ? (
                      <span className="text-muted-foreground max-w-64 wrap-break-word">
                        {notes}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">
                    {row.inputTokens}/{row.outputTokens}
                  </td>
                  <td className="py-1.5 tabular-nums">
                    {format(copy.seconds, {
                      seconds: (row.durationMs / 1000).toFixed(1),
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <PageControls
        label={copy.label}
        onPageChange={setPage}
        page={page}
        pageSize={PAGE_SIZE}
        total={rows.length}
      />
    </div>
  )
}
