import { Cinzel, Inter } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  weight: ['400', '700', '900'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata = {
  title: 'Chakdi & Court Piece — Indian Card Game',
  description: 'Play Chakdi (Chogdi) and Court Piece online with friends. Free, no login needed!',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="bg-gray-950 text-white font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
