import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Turnos — Tertianum',
  description: 'Sistema inteligente de planeamento de turnos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Jost:wght@600;700;800&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full antialiased" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  )
}
