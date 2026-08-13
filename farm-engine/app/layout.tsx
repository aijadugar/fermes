import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fermes | location intelligence with agricultural data to help you understand your land.',
  description: 'Investigate crops, locations, site conditions, and nearby agricultural businesses with Fermes.',
  generator: 'Fermes',
  icons: {
    icon: [
      {
        url: '/fermes.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/fermes.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/fermes.png',
        type: 'image/svg+xml',
      },
    ],
    apple: '/fermes.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
