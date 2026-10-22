import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ChatWidgetLazy } from '@/components/shared/ChatWidgetLazy'
import { TrackingScripts } from '@/components/TrackingScripts'
import { jsonLdHtml } from '@/lib/json-ld'
import { serverSiteUrl } from '@/lib/site-url'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

const baseUrl = serverSiteUrl()
const siteName = 'AccsPoint'
const title = 'AccsPoint — Buy Social Media Marketing Assets at One Place'
const description =
  'Buy all types of social media marketing assets in one place — hassle free. Aged accounts, PVA accounts, monetization-ready profiles and more, with crypto deposits and instant delivery.'
const keywords = [
  'social media assets',
  'buy social media accounts',
  'aged accounts',
  'pva accounts',
  'social media marketing',
  'digital assets marketplace',
  'crypto marketplace',
  'instant delivery accounts',
]

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: title,
    template: `%s · ${siteName}`,
  },
  description,
  keywords,
  authors: [{ name: 'AccsPoint' }],
  creator: 'AccsPoint',
  publisher: 'AccsPoint',
  applicationName: siteName,
  category: 'shopping',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    url: baseUrl,
    title,
    description,
    siteName,
    locale: 'en_US',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'AccsPoint — Buy social media marketing assets at one place',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#dc2626',
  colorScheme: 'light dark',
}

// JSON-LD structured data for the marketplace website.
// Helps Google understand what the site is and what it offers.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  '@id': `${baseUrl}#store`,
  name: siteName,
  url: baseUrl,
  description,
  image: `${baseUrl}/opengraph-image.png`,
  logo: `${baseUrl}/icon.svg`,
  currenciesAccepted: 'USD',
  paymentAccepted: 'Cryptocurrency',
  areaServed: 'Worldwide',
  knowsAbout: [
    'License keys',
    'Software keys',
    'Digital asset marketplace',
    'Crypto payments',
    'Instant digital delivery',
  ],
  potentialAction: {
    '@type': 'ViewAction',
    target: baseUrl,
    name: 'Browse marketplace',
  },
}

const orgLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${baseUrl}#org`,
  name: siteName,
  url: baseUrl,
  logo: `${baseUrl}/icon.svg`,
  description,
  sameAs: [] as string[],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Tracking scripts injected into <head> (GTM, GA4, Meta Pixel, etc.) */}
        <TrackingScripts position="head" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        {/* Tracking scripts injected before </body> (noscript tags, etc.) */}
        <TrackingScripts position="body" />
        {/* Floating chat support widget — client-only, lazy-loaded after hydration */}
        <ChatWidgetLazy />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(orgLd) }}
        />
      </body>
    </html>
  )
}
