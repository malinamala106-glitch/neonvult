import Image from 'next/image'
import { isImageUrlValue } from '@/lib/media'

// Shared product image/emoji thumbnail. Renders a real image when `image` is a
// URL (including /api/uploads/... IDs) and falls back to the raw value (usually
// an emoji) otherwise. Keeps URL text from ever leaking as visible content.
export function ProductThumb({
  image,
  name,
  className = '',
  iconClass = 'text-xl',
}: {
  image?: string | null
  name: string
  className?: string
  iconClass?: string
}) {
  const isImageUrl = isImageUrlValue(image)
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 overflow-hidden bg-gradient-to-br from-red-100 to-rose-50 dark:from-red-950/40 dark:to-zinc-900 ${className}`}
      role="img"
      aria-label={name ? `Image for ${name}` : 'Product image'}
    >
      {isImageUrl && image ? (
        <Image
          src={image}
          alt=""
          fill
          sizes="64px"
          className="object-cover absolute inset-0 w-full h-full"
          unoptimized={image.startsWith('http')}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
      ) : null}
      <span className={isImageUrl ? 'opacity-0' : iconClass} aria-hidden="true">
        {image || '📦'}
      </span>
    </div>
  )
}
