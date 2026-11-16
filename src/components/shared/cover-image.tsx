import { ImageOff, MapPin } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

type CoverImageProps = {
  src?: string | null
  alt: string
  fallbackLabel?: string
  className?: string
  overlay?: ReactNode
}

export function CoverImage({ src, alt, fallbackLabel, className, overlay }: CoverImageProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  return (
    <div className={cn('relative overflow-hidden cover-fallback', className)}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-ink/50">
          {failed ? <ImageOff className="h-6 w-6" /> : <MapPin className="h-6 w-6" />}
          {fallbackLabel ? (
            <span className="max-w-[80%] truncate px-3 text-xs font-bold uppercase tracking-wider">
              {fallbackLabel}
            </span>
          ) : null}
        </div>
      )}
      {overlay}
    </div>
  )
}
