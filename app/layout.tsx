import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'
import { SplashScreen } from '@/components/SplashScreen'
import { RotateNotice } from '@/components/RotateNotice'

export const metadata: Metadata = {
  title: 'Табель',
  description: 'Учёт посещений и расчёт зарплаты хора',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Табель',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F7F4F1',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-page min-h-screen">
        <SplashScreen />
        <RotateNotice />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
