import { cn } from '@/lib/utils'

interface Props {
  className?: string
  /** Values in order; fewer than two draw a gentle placeholder wave. */
  values: number[]
}

const WIDTH = 120
const HEIGHT = 36
const PAD = 4
const PLACEHOLDER = [3, 5, 4, 7, 5, 8]

/** Tiny smooth trend line, coloured by `currentColor`. Decorative. */
export function Sparkline({ className, values }: Props) {
  const points = values.length >= 2 ? values : PLACEHOLDER
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const step = (WIDTH - PAD * 2) / (points.length - 1)
  const coords = points.map((value, index) => [
    PAD + index * step,
    HEIGHT - PAD - ((value - min) / span) * (HEIGHT - PAD * 2),
  ])
  // Catmull-Rom style smoothing through every point.
  const d = coords
    .map(([x, y], index) => {
      if (index === 0) return `M${x} ${y}`
      const [px, py] = coords[index - 1]
      const mx = (px + x) / 2
      return `C${mx} ${py} ${mx} ${y} ${x} ${y}`
    })
    .join(' ')

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn('h-9 w-28', values.length < 2 && 'opacity-40', className)}
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
