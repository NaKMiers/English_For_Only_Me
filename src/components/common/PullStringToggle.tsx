'use client'

import { useState } from 'react'

import { useTheme } from '@/components/common/ThemeProvider'
import { cn } from '@/lib/utils'

/**
 * Hanging pull-string bulb, fixed to the top-right corner of the viewport
 * (outside the page chrome). It dangles from the top edge on a cord, sways
 * gently at rest, and on click "yanks" down and swings like a real pull lamp
 * while flipping light <-> light-up. The bulb glows warm amber when light-up
 * is on, and sits dim in day mode. Motion is disabled under reduced-motion.
 *
 *        │        <- cord to the top edge
 *       (💡)      <- bulb: pull it to toggle
 */
export function PullStringToggle() {
  const { theme, toggle } = useTheme()
  const [pulling, setPulling] = useState(false)
  const isLightUp = theme === 'lightup'

  function handleClick() {
    setPulling(true)
    window.setTimeout(() => setPulling(false), 640)
    toggle()
  }

  return (
    <div className="lamp-hang">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isLightUp}
        aria-label={
          isLightUp ? 'Turn off light-up mode' : 'Turn on light-up mode'
        }
        title={isLightUp ? 'Light-up mode is on' : 'Pull to light up'}
        className={cn('lamp-hang__btn', pulling && 'lamp-hang--pulling')}
      >
        <span
          className="lamp-hang__cord"
          aria-hidden="true"
        />
        <span
          className="lamp-hang__knob"
          aria-hidden="true"
        />
        <span
          aria-hidden="true"
          className={cn(
            'lamp-hang__bulb',
            isLightUp ? 'lamp-hang__bulb--on' : 'lamp-hang__bulb--off'
          )}
        >
          💡
        </span>
      </button>
    </div>
  )
}
