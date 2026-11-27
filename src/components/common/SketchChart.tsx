import { cn } from '@/lib/utils'

interface Props {
  className?: string
  label: string
  points?: number[]
}

function buildPolyline(points: number[]) {
  const safePoints = points.length > 1 ? points : [42, 58, 46, 72, 64, 82]
  const max = Math.max(...safePoints, 1)
  const width = 240
  const height = 104
  const step = width / (safePoints.length - 1)

  return safePoints
    .map((point, index) => {
      const x = Math.round(index * step)
      const y = Math.round(height - (point / max) * 78 - 12)
      return `${x},${y}`
    })
    .join(' ')
}

export function SketchChart({ className, label, points = [] }: Props) {
  const polyline = buildPolyline(points)

  return (
    <figure
      className={cn(
        'border-line bg-surface rounded-panel grid min-h-44 min-w-0 gap-3 border p-4',
        className
      )}
    >
      <figcaption className="text-xs leading-tight font-semibold tracking-normal">
        {label}
      </figcaption>
      <svg
        role="img"
        aria-label={label}
        viewBox="0 0 240 116"
        className="h-32 w-full overflow-visible"
      >
        <path
          d="M0 104 H240"
          stroke="var(--ink)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M0 18 C42 8 62 26 96 14 C135 0 174 24 240 10"
          stroke="rgba(5,5,5,0.16)"
          strokeWidth="2"
          strokeDasharray="6 8"
          fill="none"
        />
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {polyline.split(' ').map(point => {
          const [x, y] = point.split(',')

          return (
            <circle
              key={point}
              cx={x}
              cy={y}
              r="4"
              fill="var(--surface)"
              stroke="var(--ink)"
              strokeWidth="3"
            />
          )
        })}
      </svg>
    </figure>
  )
}
