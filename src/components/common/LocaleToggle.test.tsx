import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { I18nProvider } from '@/i18n/client'
import { vi as viMessages } from '@/i18n/messages/vi'

import { LocaleToggle } from './LocaleToggle'

const setLocaleAction = vi.fn<(locale: string) => Promise<void>>()

vi.mock('@/i18n/actions', () => ({
  setLocaleAction: (locale: string) => setLocaleAction(locale),
}))

describe('LocaleToggle', () => {
  beforeEach(() => {
    setLocaleAction.mockReset()
    setLocaleAction.mockResolvedValue(undefined)
  })

  test('shows English as the default choice', () => {
    render(<LocaleToggle />)

    expect(screen.getByRole('group', { name: 'Language' })).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'English' })
        .getAttribute('aria-pressed')
    ).toBe('true')
    expect(
      screen
        .getByRole('button', { name: 'Vietnamese' })
        .getAttribute('aria-pressed')
    ).toBe('false')
  })

  test('stores Vietnamese when the VI half is pressed', async () => {
    render(<LocaleToggle />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Vietnamese' }))
    })

    expect(setLocaleAction).toHaveBeenCalledWith('vi')
  })

  test('does nothing when the current language is pressed', async () => {
    render(<LocaleToggle />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'English' }))
    })

    expect(setLocaleAction).not.toHaveBeenCalled()
  })

  test('renders its labels in Vietnamese under the Vietnamese provider', () => {
    render(
      <I18nProvider
        locale="vi"
        messages={viMessages}
      >
        <LocaleToggle />
      </I18nProvider>
    )

    expect(screen.getByRole('group', { name: 'Ngôn ngữ' })).toBeTruthy()
    expect(
      screen
        .getByRole('button', { name: 'tiếng Việt' })
        .getAttribute('aria-pressed')
    ).toBe('true')
  })
})
