import { expect } from 'vitest'

/** Classes that mark a primitive which carries `hover-pop` itself. */
const POPS = /\bhover-pop\b/

/**
 * The section 5.1 budget of a module landing (or a session end), checked in
 * one place: exactly one next stop and one `cta` element in the initial
 * render, at most 4 stat chips, every link or button in the journey card
 * pops, and no static stat pops.
 */
export function expectLandingBudget(container: ParentNode) {
  expect(container.querySelectorAll('[data-next-stop]')).toHaveLength(1)
  expect(
    [...container.querySelectorAll('[class]')].filter(element =>
      /(^|\s)bg-cta(\s|$)/.test(element.getAttribute('class') ?? '')
    )
  ).toHaveLength(1)

  for (const strip of container.querySelectorAll('[data-stat-strip]'))
    expect(strip.querySelectorAll('dt').length).toBeLessThanOrEqual(4)

  for (const card of container.querySelectorAll('[data-journey-card]'))
    for (const control of card.querySelectorAll('a, button'))
      expect(
        control.getAttribute('class') ?? '',
        `${control.outerHTML.slice(0, 80)} should pop`
      ).toMatch(POPS)

  for (const chip of container.querySelectorAll('[data-stat-chip="static"]'))
    expect(chip.getAttribute('class') ?? '').not.toMatch(POPS)
}
