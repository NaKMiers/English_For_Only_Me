'use client'

import { Progress as ProgressPrimitive } from '@base-ui/react/progress'

import type { AppModuleKey } from '@/constants/modules'
import { cn } from '@/lib/utils'

/** Fill per module accent; `brand` for cross-module bars. */
export type ProgressTone = AppModuleKey | 'brand' | 'ink'

const TONE_FILL: Record<ProgressTone, string> = {
  dictation: 'bg-accent-blue',
  vocabulary: 'bg-accent-green',
  grammar: 'bg-accent-purple',
  ielts: 'bg-accent-orange',
  brand: 'bg-brand',
  ink: 'bg-cta',
}

function Progress({
  className,
  children,
  tone = 'ink',
  trackClassName,
  value,
  ...props
}: ProgressPrimitive.Root.Props & {
  /** The bar's fill: the module accent of the page it sits on. */
  tone?: ProgressTone
  /** Height and colour overrides for the track, e.g. `h-2 bg-surface/80`. */
  trackClassName?: string
}) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn('flex flex-wrap gap-3', className)}
      {...props}
    >
      {children}
      <ProgressTrack className={trackClassName}>
        <ProgressIndicator className={TONE_FILL[tone]} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        'bg-tint relative flex h-1.5 w-full items-center overflow-x-hidden rounded-full',
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        'bg-cta motion-grow-x h-full rounded-full transition-[width] duration-500 ease-(--ease-out-soft) motion-reduce:transition-none',
        className
      )}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn('text-sm font-medium', className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn('text-ink-soft ml-auto text-sm tabular-nums', className)}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
