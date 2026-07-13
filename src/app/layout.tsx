import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import './globals.css'

import { ThemeProvider } from '@/components/common/ThemeProvider'

const fontVariables = {
  '--font-montserrat': 'Montserrat, Arial, Helvetica, sans-serif',
  '--font-source-sans': '"Source Sans 3", Arial, Helvetica, sans-serif',
} as CSSProperties

// No-FOUC theme script: runs before first paint, resolves light vs light-up
// from localStorage + local time (mirrors src/lib/theme/theme.ts), and stamps
// data-theme on <html> so the correct paper/room colors paint immediately.
// Thresholds: 06:30 (390) and 18:30 (1110) minutes-since-midnight.
const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem('efom-theme');var s=null;if(raw){try{var v=JSON.parse(raw);if(v&&(v.theme==='light'||v.theme==='lightup')&&(v.source==='manual'||v.source==='auto')&&(v.expiresAt===null||typeof v.expiresAt==='number'))s=v;}catch(e){}}var n=new Date();var m=n.getHours()*60+n.getMinutes();var t=(m>=1110||m<390)?'lightup':'light';if(s&&s.source==='manual'&&s.expiresAt!=null&&n.getTime()<s.expiresAt)t=s.theme;document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`

export const metadata: Metadata = {
  title: {
    default: 'English For Only Me',
    template: '%s | English For Only Me',
  },
  description:
    'A private IELTS study desk for dictation, vocabulary, review, writing notes, and future English practice modules.',
  manifest: '/site.webmanifest',
  icons: {
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
  },
}

export const viewport: Viewport = {
  themeColor: '#e03020',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      style={fontVariables}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
