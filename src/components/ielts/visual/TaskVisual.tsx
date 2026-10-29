import { memo } from 'react'

import { cn } from '@/lib/utils'
import type { IeltsChartVisual, IeltsVisual } from '@/modules/ielts/schema'

/*
 * Exam-style Task 1 visuals drawn as plain SVG: black and grey strokes, a
 * distinct marker and dash pattern per series so the chart reads in
 * greyscale, a light grid, title, axis labels with units and a legend. No
 * app red, no chart library.
 */

const STROKES = [
  '#050505',
  '#555555',
  '#8a8a8a',
  '#050505',
  '#555555',
  '#8a8a8a',
  '#050505',
  '#555555',
]
const DASHES = ['', '6 4', '2 3', '10 3 2 3', '', '6 4', '2 3', '10 3 2 3']
const FILLS = [
  '#050505',
  '#7a7a7a',
  '#ffffff',
  '#c4c4c4',
  '#3a3a3a',
  '#a0a0a0',
  '#e2e2e2',
  '#5e5e5e',
]
const PATTERNS = [
  'none',
  'none',
  'url(#ielts-hatch)',
  'none',
  'url(#ielts-dots)',
  'none',
  'url(#ielts-hatch)',
  'none',
]

const WIDTH = 640
const HEIGHT = 380
const PAD = { top: 48, right: 24, bottom: 72, left: 64 }

/** A "nice" axis maximum: 1, 2, 2.5 or 5 times a power of ten. */
export function niceMax(value: number) {
  if (value <= 0) return 1

  const power = 10 ** Math.floor(Math.log10(value))

  for (const step of [1, 2, 2.5, 5, 10])
    if (step * power >= value) return step * power

  return 10 * power
}

function Marker({ index, x, y }: { index: number; x: number; y: number }) {
  const stroke = STROKES[index % STROKES.length]
  const shape = index % 4

  if (shape === 0)
    return (
      <circle
        cx={x}
        cy={y}
        fill={stroke}
        r={4}
      />
    )

  if (shape === 1)
    return (
      <rect
        fill="#ffffff"
        height={8}
        stroke={stroke}
        strokeWidth={2}
        width={8}
        x={x - 4}
        y={y - 4}
      />
    )

  if (shape === 2)
    return (
      <path
        d={`M${x} ${y - 5} L${x + 5} ${y + 4} L${x - 5} ${y + 4} Z`}
        fill={stroke}
      />
    )

  return (
    <path
      d={`M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x + 4} ${y - 4} L${x - 4} ${y + 4}`}
      stroke={stroke}
      strokeWidth={2}
    />
  )
}

function Defs() {
  return (
    <defs>
      <pattern
        height={6}
        id="ielts-hatch"
        patternTransform="rotate(45)"
        patternUnits="userSpaceOnUse"
        width={6}
      >
        <rect
          fill="#ffffff"
          height={6}
          width={6}
        />
        <line
          stroke="#050505"
          strokeWidth={1.5}
          x1={0}
          x2={0}
          y1={0}
          y2={6}
        />
      </pattern>
      <pattern
        height={6}
        id="ielts-dots"
        patternUnits="userSpaceOnUse"
        width={6}
      >
        <rect
          fill="#ffffff"
          height={6}
          width={6}
        />
        <circle
          cx={3}
          cy={3}
          fill="#050505"
          r={1.2}
        />
      </pattern>
    </defs>
  )
}

function Legend({ names, y }: { names: string[]; y: number }) {
  const itemWidth = Math.min(
    180,
    (WIDTH - PAD.left) / Math.max(1, names.length)
  )

  return (
    <g fontSize={12}>
      {names.map((name, index) => {
        const x = PAD.left + index * itemWidth

        return (
          <g key={name}>
            <rect
              fill={FILLS[index % FILLS.length]}
              height={10}
              stroke="#050505"
              width={14}
              x={x}
              y={y - 9}
            />
            <rect
              fill={PATTERNS[index % PATTERNS.length]}
              height={10}
              width={14}
              x={x}
              y={y - 9}
            />
            <text
              x={x + 20}
              y={y}
            >
              {name}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function Axes({ chart, max }: { chart: IeltsChartVisual; max: number }) {
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const ticks = Array.from({ length: 6 }, (_, index) => (max / 5) * index)

  return (
    <g fontSize={12}>
      {ticks.map(tick => {
        const y = PAD.top + plotHeight - (tick / max) * plotHeight

        return (
          <g key={tick}>
            <line
              stroke="#d8d8d8"
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
            />
            <text
              textAnchor="end"
              x={PAD.left - 6}
              y={y + 4}
            >
              {Number(tick.toFixed(2))}
            </text>
          </g>
        )
      })}
      <line
        stroke="#050505"
        strokeWidth={1.5}
        x1={PAD.left}
        x2={PAD.left}
        y1={PAD.top}
        y2={HEIGHT - PAD.bottom}
      />
      <line
        stroke="#050505"
        strokeWidth={1.5}
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={HEIGHT - PAD.bottom}
        y2={HEIGHT - PAD.bottom}
      />
      {chart.yLabel ? (
        <text
          fontWeight={700}
          textAnchor="middle"
          transform={`translate(16 ${PAD.top + plotHeight / 2}) rotate(-90)`}
        >
          {chart.yLabel}
        </text>
      ) : null}
      {chart.xLabel ? (
        <text
          fontWeight={700}
          textAnchor="middle"
          x={PAD.left + (WIDTH - PAD.left - PAD.right) / 2}
          y={HEIGHT - PAD.bottom + 40}
        >
          {chart.xLabel}
        </text>
      ) : null}
    </g>
  )
}

function LineChart({ chart }: { chart: IeltsChartVisual }) {
  const max = niceMax(Math.max(0, ...chart.series.flatMap(item => item.values)))
  const plotWidth = WIDTH - PAD.left - PAD.right
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const step = plotWidth / Math.max(1, chart.categories.length - 1)
  const point = (index: number, value: number) => ({
    x: PAD.left + index * step,
    y: PAD.top + plotHeight - (value / max) * plotHeight,
  })

  return (
    <>
      <Axes
        chart={chart}
        max={max}
      />
      {chart.categories.map((category, index) => (
        <text
          fontSize={12}
          key={category}
          textAnchor="middle"
          x={PAD.left + index * step}
          y={HEIGHT - PAD.bottom + 18}
        >
          {category}
        </text>
      ))}
      {chart.series.map((series, seriesIndex) => (
        <g key={series.name}>
          <polyline
            fill="none"
            points={series.values
              .map((value, index) => {
                const { x, y } = point(index, value)

                return `${x},${y}`
              })
              .join(' ')}
            stroke={STROKES[seriesIndex % STROKES.length]}
            strokeDasharray={DASHES[seriesIndex % DASHES.length]}
            strokeWidth={2}
          />
          {series.values.map((value, index) => (
            <Marker
              index={seriesIndex}
              key={index}
              {...point(index, value)}
            />
          ))}
        </g>
      ))}
    </>
  )
}

function BarChart({ chart }: { chart: IeltsChartVisual }) {
  const max = niceMax(Math.max(0, ...chart.series.flatMap(item => item.values)))
  const plotWidth = WIDTH - PAD.left - PAD.right
  const plotHeight = HEIGHT - PAD.top - PAD.bottom
  const groupWidth = plotWidth / Math.max(1, chart.categories.length)
  const barWidth = (groupWidth * 0.75) / Math.max(1, chart.series.length)

  return (
    <>
      <Axes
        chart={chart}
        max={max}
      />
      {chart.categories.map((category, categoryIndex) => {
        const groupX =
          PAD.left + categoryIndex * groupWidth + groupWidth * 0.125

        return (
          <g key={category}>
            {chart.series.map((series, seriesIndex) => {
              const value = series.values[categoryIndex] ?? 0
              const height = (value / max) * plotHeight
              const x = groupX + seriesIndex * barWidth
              const y = PAD.top + plotHeight - height

              return (
                <g key={series.name}>
                  <rect
                    fill={FILLS[seriesIndex % FILLS.length]}
                    height={height}
                    stroke="#050505"
                    width={barWidth}
                    x={x}
                    y={y}
                  />
                  <rect
                    fill={PATTERNS[seriesIndex % PATTERNS.length]}
                    height={height}
                    width={barWidth}
                    x={x}
                    y={y}
                  />
                </g>
              )
            })}
            <text
              fontSize={12}
              textAnchor="middle"
              x={groupX + (barWidth * chart.series.length) / 2}
              y={HEIGHT - PAD.bottom + 18}
            >
              {category}
            </text>
          </g>
        )
      })}
    </>
  )
}

function PieCharts({ chart }: { chart: IeltsChartVisual }) {
  const count = Math.max(1, chart.series.length)
  const radius = Math.min(110, (WIDTH - 40) / count / 2 - 12)
  const cy = PAD.top + radius + 8

  return (
    <>
      {chart.series.map((series, seriesIndex) => {
        const cx = (WIDTH / count) * (seriesIndex + 0.5)
        const total = series.values.reduce((sum, value) => sum + value, 0) || 1
        let angle = -Math.PI / 2

        return (
          <g key={series.name}>
            {series.values.map((value, index) => {
              const sweep = (value / total) * Math.PI * 2
              const start = angle
              const end = angle + sweep
              const large = sweep > Math.PI ? 1 : 0
              const path = `M${cx} ${cy} L${cx + radius * Math.cos(start)} ${cy + radius * Math.sin(start)} A${radius} ${radius} 0 ${large} 1 ${cx + radius * Math.cos(end)} ${cy + radius * Math.sin(end)} Z`
              const mid = start + sweep / 2

              angle = end

              return (
                <g key={index}>
                  <path
                    d={path}
                    fill={FILLS[index % FILLS.length]}
                    stroke="#050505"
                  />
                  <path
                    d={path}
                    fill={PATTERNS[index % PATTERNS.length]}
                  />
                  {value / total >= 0.04 ? (
                    <text
                      fontSize={11}
                      fontWeight={700}
                      paintOrder="stroke"
                      stroke="#ffffff"
                      strokeWidth={3}
                      textAnchor="middle"
                      x={cx + radius * 0.65 * Math.cos(mid)}
                      y={cy + radius * 0.65 * Math.sin(mid) + 4}
                    >
                      {`${Number(value.toFixed(1))}${chart.unit === '%' ? '%' : ''}`}
                    </text>
                  ) : null}
                </g>
              )
            })}
            <text
              fontSize={13}
              fontWeight={700}
              textAnchor="middle"
              x={cx}
              y={cy + radius + 22}
            >
              {series.name}
            </text>
          </g>
        )
      })}
    </>
  )
}

function DataTable({ chart }: { chart: IeltsChartVisual }) {
  return (
    <div className="overflow-x-auto">
      <table className="border-manga-black w-full border-collapse border-2 text-sm">
        <caption className="pb-2 font-sans font-black">{chart.title}</caption>
        <thead>
          <tr>
            <th
              className="border-manga-black border-2 px-2 py-1 text-left"
              scope="col"
            >
              {chart.xLabel}
            </th>
            {chart.series.map(series => (
              <th
                className="border-manga-black border-2 px-2 py-1 text-right"
                key={series.name}
                scope="col"
              >
                {series.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.categories.map((category, index) => (
            <tr key={category}>
              <th
                className="border-manga-black border-2 px-2 py-1 text-left"
                scope="row"
              >
                {category}
              </th>
              {chart.series.map(series => (
                <td
                  className="border-manga-black border-2 px-2 py-1 text-right tabular-nums"
                  key={series.name}
                >
                  {series.values[index] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {chart.unit ? (
        <p className="pt-1 text-xs font-semibold">Unit: {chart.unit}</p>
      ) : null}
    </div>
  )
}

function describe(chart: IeltsChartVisual) {
  return `${chart.kind} chart: ${chart.title}. ${chart.series
    .map(series => `${series.name}: ${series.values.join(', ')}`)
    .join('; ')}`
}

export const TaskVisual = memo(function TaskVisual({
  className,
  visual,
}: {
  className?: string
  visual: IeltsVisual
}) {
  if (visual.kind === 'image')
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded Cloudinary image of any size
      <img
        alt={visual.alt}
        className={cn('bg-manga-white w-full object-contain', className)}
        src={visual.imageUrl}
      />
    )

  if (visual.kind === 'table')
    return (
      <div className={cn('bg-manga-white p-3', className)}>
        <DataTable chart={visual} />
      </div>
    )

  const legendY = HEIGHT - 14

  return (
    <figure className={cn('bg-manga-white p-2', className)}>
      <svg
        aria-label={describe(visual)}
        className="h-auto w-full font-sans"
        role="img"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      >
        <Defs />
        <text
          fontSize={14}
          fontWeight={700}
          textAnchor="middle"
          x={WIDTH / 2}
          y={22}
        >
          {visual.title}
        </text>
        {visual.kind === 'line' ? <LineChart chart={visual} /> : null}
        {visual.kind === 'bar' ? <BarChart chart={visual} /> : null}
        {visual.kind === 'pie' ? <PieCharts chart={visual} /> : null}
        {visual.kind === 'pie' ? (
          <Legend
            names={visual.categories}
            y={legendY}
          />
        ) : (
          <Legend
            names={visual.series.map(series => series.name)}
            y={legendY}
          />
        )}
      </svg>
      {visual.unit && visual.kind !== 'pie' ? (
        <figcaption className="text-center text-xs font-semibold">
          Unit: {visual.unit}
        </figcaption>
      ) : null}
    </figure>
  )
})
