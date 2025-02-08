import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

import { headers } from 'next/headers' // added
import ContextProvider from '@/context'
import { TwasProvider } from '@/context/twas'

export const metadata: Metadata = {
  title: 'twas',
  description: 'Twas Launched'
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {

  const headersObj = await headers();
  const cookies = headersObj.get('cookie')

  return (
    <html lang="en">
      <body className={inter.className}>
        <ContextProvider cookies={cookies}><TwasProvider>{children}</TwasProvider></ContextProvider>
      </body>
    </html>
  )
}