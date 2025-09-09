import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LT Document Maker',
  description: 'ライトニングトーク資料作成ツール',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  )
}