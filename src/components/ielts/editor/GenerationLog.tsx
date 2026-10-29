import type { IeltsAdminTest } from '@/modules/ielts/tests/testService'

const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
})

/** Every AI request on this test: kind, outcome, tokens, time, failures. */
export function GenerationLog({
  rows,
}: {
  rows: IeltsAdminTest['generationLog']
}) {
  if (!rows.length) return null

  return (
    <details className="border-ex-line rounded-xl border bg-white p-3">
      <summary className="cursor-pointer font-sans text-sm font-bold">
        Nhật ký AI ({rows.length})
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-ex-line border-b font-sans uppercase">
              {[
                'Lúc',
                'Phần',
                'Loại',
                'Kết quả',
                'Token',
                'Thời gian',
                'Ghi chú',
              ].map(label => (
                <th
                  className="py-1 pr-2"
                  key={label}
                  scope="col"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((row, index) => (
              <tr
                className="border-ex-line border-b align-top"
                key={index}
              >
                <td className="py-1 pr-2 tabular-nums">
                  {timeFormat.format(new Date(row.at))}
                </td>
                <td className="py-1 pr-2">{row.sectionKey}</td>
                <td className="py-1 pr-2">{row.kind}</td>
                <td className="py-1 pr-2 font-bold">{row.outcome}</td>
                <td className="py-1 pr-2 tabular-nums">
                  {row.inputTokens}/{row.outputTokens}
                </td>
                <td className="py-1 pr-2 tabular-nums">
                  {(row.durationMs / 1000).toFixed(1)}s
                </td>
                <td className="py-1">
                  {row.failedRules.join(', ')}
                  {row.error ? ` ${row.error}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
