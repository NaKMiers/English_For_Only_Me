import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PullStringToggle } from './PullStringToggle'
import { ThemeProvider } from './ThemeProvider'

// jsdom in this project does not expose localStorage by default (see
// dictationPreferences.test.ts) - install a minimal in-memory mock.
function installLocalStorage() {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    },
  })
}

function renderToggle() {
  return render(
    <ThemeProvider>
      <PullStringToggle />
    </ThemeProvider>
  )
}

describe('PullStringToggle', () => {
  beforeEach(() => {
    installLocalStorage()
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    // Pin the clock to daytime so the auto theme is deterministic (light).
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 13, 12, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a labelled toggle button', () => {
    renderToggle()
    expect(
      screen.getByRole('button', { name: /light-up mode/i })
    ).toBeInTheDocument()
  })

  it('flips the theme on click and persists the choice', () => {
    renderToggle()
    const btn = screen.getByRole('button', { name: /light-up mode/i })

    // Daytime -> starts light.
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(btn).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(btn)

    expect(document.documentElement.getAttribute('data-theme')).toBe('lightup')
    expect(
      screen.getByRole('button', { name: /turn off light-up/i })
    ).toHaveAttribute('aria-pressed', 'true')
    // Manual override during the day (auto=light) is stored as manual.
    const stored = JSON.parse(localStorage.getItem('efom-theme') ?? '{}')
    expect(stored.theme).toBe('lightup')
    expect(stored.source).toBe('manual')
  })
})
