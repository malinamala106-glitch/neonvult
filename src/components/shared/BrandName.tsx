/**
 * AccsPoint brand lock: logo image + two-tone wordmark.
 * "Accs" renders dark, "Point" renders red (matches the brand assets).
 */
export function BrandLock({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2 shrink-0 leading-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="AccsPoint"
        className={`rounded-md object-contain ${compact ? 'w-7 h-7' : 'w-8 h-8'}`}
        aria-hidden="true"
      />
      <span
        className={`font-bold tracking-tight hidden sm:inline ${compact ? 'text-sm' : ''}`}
      >
        <span className="text-zinc-900 dark:text-zinc-50">Accs</span>
        <span className="text-red-600 dark:text-red-500">Point</span>
      </span>
    </span>
  )
}
