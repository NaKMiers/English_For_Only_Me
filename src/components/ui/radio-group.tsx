'use client'

import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'

import { cn } from '@/lib/utils'

/**
 * Single choice from a short list, themed like `Checkbox`: a round ink ring
 * that fills with ink when chosen. Arrow keys move inside the group.
 */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('grid gap-2', className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        'peer border-manga-black bg-manga-white relative flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-colors outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--ring) disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="bg-manga-black size-2.5 rounded-full"
      />
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
