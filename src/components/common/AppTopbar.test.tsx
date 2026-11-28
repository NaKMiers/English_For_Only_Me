import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { AccountProvider } from './AccountProvider'
import { AppTopbar } from './AppTopbar'

describe('AppTopbar', () => {
  test('renders the brand logo, title and the phone menu button', () => {
    const html = renderToStaticMarkup(
      <AppTopbar
        activeHref="/dictation"
        subtitle="Listening practice"
      />
    )

    expect(html).toContain('English For Only Me logo')
    expect(html).toContain('English For Only Me')
    expect(html).toContain('Listening practice')
    expect(html).toContain('aria-label="Open menu"')
  })

  test('shows the account chip only when asked (the home page)', () => {
    const account = {
      account: { firstName: 'Khoa', image: null, initial: 'K', isAdmin: false },
    }
    const plain = renderToStaticMarkup(
      <AccountProvider value={account}>
        <AppTopbar />
      </AccountProvider>
    )
    const home = renderToStaticMarkup(
      <AccountProvider value={account}>
        <AppTopbar showAccount />
      </AccountProvider>
    )

    expect(plain).not.toContain('aria-haspopup="menu"')
    expect(home).toContain('aria-haspopup="menu"')
    expect(home).toContain('Khoa')
  })

  test('never offers a sign-in control (the login page is the only way in)', () => {
    const html = renderToStaticMarkup(
      <AccountProvider value={{ account: null }}>
        <AppTopbar showAccount />
      </AccountProvider>
    )

    expect(html).not.toContain('aria-haspopup="menu"')
    expect(html).not.toContain('Sign in')
    expect(html).not.toContain('<form')
  })
})
