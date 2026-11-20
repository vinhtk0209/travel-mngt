import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useI18n } from '@/i18n/i18n-context'

const SIZE = 256

export function AvatarCropModal({ file, onClose, onSave, saving }: {
  file: File | null
  onClose: () => void
  onSave: (file: File) => Promise<void>
  saving: boolean
}) {
  const { t } = useI18n()
  const [url, setUrl] = useState('')
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null)

  useEffect(() => {
    if (!file) return
    const next = URL.createObjectURL(file)
    setUrl(next)
    setZoom(1)
    setOffset({ x: 0, y: 0 })
    return () => URL.revokeObjectURL(next)
  }, [file])

  const save = async () => {
    const image = imageRef.current
    if (!image || !file) return
    const canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    const context = canvas.getContext('2d')
    if (!context) return
    const scale = Math.max(SIZE / image.naturalWidth, SIZE / image.naturalHeight) * zoom
    const width = image.naturalWidth * scale
    const height = image.naturalHeight * scale
    context.drawImage(image, (SIZE - width) / 2 + offset.x, (SIZE - height) / 2 + offset.y, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.9))
    if (blob) await onSave(new File([blob], 'avatar.webp', { type: 'image/webp' }))
  }

  return <Modal open={Boolean(file)} onClose={onClose} title={t('profile.cropTitle')} size="sm"
    footer={<><Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
      <Button onClick={() => void save()} isLoading={saving}>{t('common.save')}</Button></>}>
    <div className="mx-auto h-64 w-64 touch-none overflow-hidden rounded-full border-4 border-border bg-cream"
      onPointerDown={(event) => { dragRef.current = { x: event.clientX, y: event.clientY, startX: offset.x, startY: offset.y }; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={(event) => { const drag = dragRef.current; if (drag) setOffset({ x: drag.startX + event.clientX - drag.x, y: drag.startY + event.clientY - drag.y }) }}
      onPointerUp={() => { dragRef.current = null }}>
      {url ? <img ref={imageRef} src={url} alt={t('profile.cropTitle')}
        className="h-full w-full select-none object-cover" draggable={false}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }} /> : null}
    </div>
    <label className="mt-5 block text-sm font-bold text-ink">{t('profile.zoom')}
      <input type="range" min="1" max="3" step="0.05" value={zoom}
        onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full accent-coral-500" />
    </label>
    <p className="mt-2 text-xs text-ink-muted">{t('profile.cropHint')}</p>
  </Modal>
}
