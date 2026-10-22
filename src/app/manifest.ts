// https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AccsPoint — Social Media Marketing Assets',
    short_name: 'AccsPoint',
    description:
      'Buy all types of social media marketing assets in one place — hassle free. Crypto deposits, instant delivery, admin-managed orders.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#dc2626',
    orientation: 'portrait-primary',
    categories: ['shopping', 'business', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
