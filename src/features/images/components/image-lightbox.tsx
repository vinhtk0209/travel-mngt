import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export type LightboxImage = {
  url: string
  alt: string
}

type ImageLightboxProps = {
  images: LightboxImage[]
  index: number
  onClose: () => void
  onIndexChange: (index: number) => void
}

export function ImageLightbox({ images, index, onClose, onIndexChange }: ImageLightboxProps) {
  const current = images[index]

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % images.length)
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [images.length, index, onClose, onIndexChange])

  if (!current) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="relative flex max-h-full w-full max-w-4xl flex-col items-center">
        <img
          src={current.url}
          alt={current.alt}
          className="max-h-[78vh] w-auto max-w-full rounded-3xl object-contain shadow-lift"
        />
        <div className="mt-3 flex items-center gap-3 rounded-full bg-white/90 px-3 py-1.5 text-sm font-bold text-ink">
          <button
            type="button"
            onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
            className="rounded-full p-1.5 hover:bg-coral-50"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            {index + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={() => onIndexChange((index + 1) % images.length)}
            className="rounded-full p-1.5 hover:bg-coral-50"
            aria-label="Next photo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink shadow-card hover:bg-white"
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  )
}
