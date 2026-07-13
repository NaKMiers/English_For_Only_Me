'use client'

import { useState } from 'react'

import { useTheme } from '@/components/common/ThemeProvider'
import { cn } from '@/lib/utils'

/**
 * Pull-string filament bulb that toggles light <-> light-up.
 *
 *      │        <- cord (yanks down on click)
 *     (◯)       <- bulb: dim in day mode, glowing amber in light-up
 *
 * The bulb sits in a manga panel button. Clicking "pulls the cord": the cord
 * stretches and the bulb dips for a beat (the "tách" moment), then the whole
 * page crossfades via the CSS transitions in globals.css. The pull animation
 * is disabled under prefers-reduced-motion.
 */
export function PullStringToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const [pulling, setPulling] = useState(false)
  const isLightUp = theme === 'lightup'

  function handleClick() {
    setPulling(true)
    window.setTimeout(() => setPulling(false), 220)
    toggle()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isLightUp}
      aria-label={
        isLightUp ? 'Turn off light-up mode' : 'Turn on light-up mode'
      }
      title={isLightUp ? 'Light-up mode is on' : 'Light-up mode is off'}
      className={cn(
        'lamp-toggle border-manga-black bg-manga-white grid size-14 shrink-0 place-items-center border-3 shadow-[3px_3px_0_var(--manga-black)] transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn('lamp-toggle__inner grid justify-items-center', {
          'lamp-toggle--pulling': pulling,
        })}
      >
        <span className="lamp-toggle__cord bg-manga-black block h-3 w-0.5 origin-top" />
        <span
          className={cn(
            'lamp-toggle__bulb text-lg leading-none transition-[filter,text-shadow] duration-300',
            isLightUp ? 'lamp-toggle__bulb--on' : 'opacity-55 grayscale'
          )}
        >
          💡
        </span>
      </span>
    </button>
  )
}
