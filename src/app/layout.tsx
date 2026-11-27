import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

import { ThemeProvider } from '@/components/common/ThemeProvider'
import { I18nProvider } from '@/i18n/client'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { getLocale, getMessages } from '@/i18n/server'
import { cn } from '@/lib/utils'

// One geometric sans for the whole app, headings and body alike. Be Vietnam
// Pro is drawn for Vietnamese, so stacked diacritics in lesson data (ộ, ữ, ẩ)
// stay in the same face instead of falling back glyph by glyph. It is not a
// variable font, so every weight the UI uses is listed.
const appFont = Be_Vietnam_Pro({
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-app',
  display: 'swap',
})

// No-FOUC theme script: runs before first paint, resolves light vs light-up
// from localStorage + local time (mirrors src/lib/theme/theme.ts), and stamps
// data-theme on <html> so the correct day / night colors paint immediately.
// Thresholds: 06:30 (390) and 18:30 (1110) minutes-since-midnight.
const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem('efom-theme');var s=null;if(raw){try{var v=JSON.parse(raw);if(v&&(v.theme==='light'||v.theme==='lightup')&&(v.source==='manual'||v.source==='auto')&&(v.expiresAt===null||typeof v.expiresAt==='number'))s=v;}catch(e){}}var n=new Date();var m=n.getHours()*60+n.getMinutes();var t=(m>=1110||m<390)?'lightup':'light';if(s&&s.source==='manual'&&s.expiresAt!=null&&n.getTime()<s.expiresAt)t=s.theme;document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`

const ICONS: Metadata['icons'] = {
  icon: [
    { url: '/favicon.ico', sizes: 'any' },
    { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
    { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    {
      url: '/android-chrome-192x192.png',
      type: 'image/png',
      sizes: '192x192',
    },
    {
      url: '/android-chrome-512x512.png',
      type: 'image/png',
      sizes: '512x512',
    },
  ],
  apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: {
      default: t.common.app.name,
      template: `%s | ${t.common.app.name}`,
    },
    description: t.common.app.description,
    manifest: '/site.webmanifest',
    icons: ICONS,
  }
}

export const viewport: Viewport = {
  themeColor: '#f3eaf2',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = locale === DEFAULT_LOCALE ? undefined : await getMessages()

  return (
    <html
      lang={locale}
      className={cn(appFont.variable, 'h-full antialiased')}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <I18nProvider
          locale={locale}
          messages={messages}
        >
          <ThemeProvider>{children}</ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
