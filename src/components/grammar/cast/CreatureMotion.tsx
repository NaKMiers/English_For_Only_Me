'use client'

import { useEffect, useRef, type ReactNode } from 'react'

import { partSelector } from './partRig'

/** What just happened to the learner. Drives which sequence plays. */
export type CreatureOutcome = 'correct' | 'wrong' | 'revealed' | 'revive' | null

/**
 * The only client component in the comic tree.
 *
 * It receives the creature as `children`, never as an import. A client component
 * cannot import a server component, but a server component passed as `children`
 * is not pulled into the client module graph at all - so the SVG stays
 * server-rendered while this drives it. Confirmed in the local Next docs
 * (`01-app/01-getting-started/05-server-and-client-components.md:178`).
 *
 * It animates by querying part-rig selectors inside its own subtree: it reads the
 * SVG's DOM, and knows nothing about which species it is holding.
 */
export function CreatureMotion({
  children,
  outcome,
}: {
  children: ReactNode
  outcome: CreatureOutcome
}) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!outcome) return

    const host = hostRef.current

    if (!host) return

    // Checked BEFORE starting, not by cancelling afterwards. A learner who asked
    // for no motion should never see the first frame of a sequence.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    if (typeof host.animate !== 'function') return

    const animations = playSequence(host, outcome)

    // Ref cleanup rather than relying on garbage collection: an unmounted
    // element with a running animation keeps a live timeline.
    return () => {
      for (const animation of animations) animation.cancel()
    }
  }, [outcome])

  return (
    <div
      className="relative"
      ref={hostRef}
    >
      {children}
    </div>
  )
}

function playSequence(
  host: HTMLElement,
  outcome: Exclude<CreatureOutcome, null>
) {
  const animations: Animation[] = []
  const animate = (
    selector: string | null,
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions
  ) => {
    const targets = selector
      ? host.querySelectorAll<SVGElement>(selector)
      : [host]

    for (const target of targets)
      animations.push(target.animate(keyframes, options))
  }

  if (outcome === 'correct') {
    // A hit: the whole creature recoils, the jaw drops, the eyes squeeze shut.
    animate(
      null,
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-9px) rotate(-2deg)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 320, easing: 'ease-out' }
    )
    animate(
      partSelector('jaw'),
      [
        { transform: 'scaleY(1)' },
        { transform: 'scaleY(1.6)' },
        { transform: 'scaleY(1)' },
      ],
      { duration: 300, easing: 'ease-out' }
    )
    animate(
      partSelector('eye'),
      [
        { transform: 'scaleY(1)' },
        { transform: 'scaleY(0.15)' },
        { transform: 'scaleY(1)' },
      ],
      { duration: 260, easing: 'ease-out' }
    )
    animate(
      partSelector('arm'),
      [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(-14deg)' },
        { transform: 'rotate(0deg)' },
      ],
      { duration: 340, easing: 'ease-out' }
    )

    return animations
  }

  if (outcome === 'wrong') {
    // The creature does NOT flinch. It is unmoved, and that is the feedback.
    // Only the crest pulses, so the page still acknowledges the submission.
    animate(
      partSelector('crest'),
      [{ opacity: 1 }, { opacity: 0.25 }, { opacity: 1 }],
      { duration: 220, easing: 'ease-in-out', iterations: 2 }
    )

    return animations
  }

  if (outcome === 'revive') {
    // It came back. Refills from a silhouette and climbs.
    animate(
      null,
      [
        { opacity: 0.3, transform: 'scale(0.94)' },
        { opacity: 1, transform: 'scale(1.03)' },
        { opacity: 1, transform: 'scale(1)' },
      ],
      { duration: 620, easing: 'ease-out' }
    )
    animate(partSelector('eye'), [{ opacity: 0 }, { opacity: 1 }], {
      duration: 420,
      easing: 'ease-in',
      fill: 'none',
    })

    return animations
  }

  // `revealed`: nothing moves. The learner looked at the answer, and the page
  // withholds the acknowledgement rather than rewarding it.
  return animations
}
