import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LOGIN_HERO_SENTENCES, LoginHero } from './LoginHero'

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: reduce,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

/** Each letter schedules the next after a render, so step the clock. */
function advance(ms: number, step = 100) {
  for (let elapsed = 0; elapsed < ms; elapsed += step)
    act(() => {
      vi.advanceTimersByTime(step)
    })
}

describe('LoginHero', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('is decoration only, with the four modules around Buddy', () => {
    stubReducedMotion(true)
    const { container } = render(<LoginHero />)
    const hero = screen.getByTestId('login-hero')

    expect(hero).toHaveAttribute('aria-hidden', 'true')
    for (const name of ['Dictation', 'Grammar', 'Vocab', 'IELTS'])
      expect(hero).toHaveTextContent(name)
    expect(container.querySelector('img[data-mood=happy]')).toHaveAttribute(
      'loading',
      'eager'
    )
  })

  it('shows a finished sentence and no caret with reduced motion', () => {
    stubReducedMotion(true)
    const { container } = render(<LoginHero />)

    expect(screen.getByTestId('login-hero-typed')).toHaveTextContent(
      LOGIN_HERO_SENTENCES[0]
    )
    expect(container.querySelector('.login-caret')).toBeNull()
  })

  it('types the sentence letter by letter, then moves to the next', () => {
    vi.useFakeTimers()
    stubReducedMotion(false)
    render(<LoginHero />)

    const typed = screen.getByTestId('login-hero-typed')
    const first = LOGIN_HERO_SENTENCES[0]

    expect(typed.textContent).toBe('')

    advance(400)
    expect(typed.textContent?.length).toBeGreaterThan(0)
    expect(first.startsWith(typed.textContent ?? '')).toBe(true)

    advance(first.length * 120)
    expect(typed).toHaveTextContent(first)

    advance(3000)
    expect(LOGIN_HERO_SENTENCES[1].startsWith(typed.textContent ?? 'x')).toBe(
      true
    )
  })
})
