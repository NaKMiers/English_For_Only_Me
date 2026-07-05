import type { Metadata } from 'next'
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
