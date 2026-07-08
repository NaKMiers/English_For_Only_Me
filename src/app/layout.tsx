import type { Metadata, Viewport } from 'next'
import type { CSSProperties } from 'react'
import './globals.css'

const fontVariables = {
  '--font-montserrat': 'Montserrat, Arial, Helvetica, sans-serif',
  '--font-source-sans': '"Source Sans 3", Arial, Helvetica, sans-serif',
} as CSSProperties

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
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
