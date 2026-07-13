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
          <svg
            viewBox="0 0 24 32"
            width="30"
            height="40"
            fill="none"
          >
            {/* glass */}
            <path
              className="lamp-hang__glass"
              d="M12 2.5c4.4 0 7.5 3.3 7.5 7.4 0 2.9-1.6 4.9-2.9 6.4-.8 1-1.2 1.8-1.3 2.9H8.7c-.1-1.1-.5-1.9-1.3-2.9-1.3-1.5-2.9-3.5-2.9-6.4C4.5 5.8 7.6 2.5 12 2.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            {/* filament */}
            <path
              className="lamp-hang__filament"
              d="M9.3 11.2 12 14l2.7-3.6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* screw base */}
            <path
              d="M8.7 22h6.6M9.3 25h5.4M10 28h4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
    </div>
  )
}
