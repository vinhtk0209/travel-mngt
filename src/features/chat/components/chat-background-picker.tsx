import { ImagePlus, Palette, RotateCcw } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { ChatBackground } from '@/lib/supabase/database.types'
import { IMAGE_ACCEPT } from '@/utils/image'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n/i18n-context'
import type { TranslationKey } from '@/i18n/translate'
import { cn } from '@/utils/cn'
import { CHAT_BACKGROUND_OPTIONS, getChatBackgroundSwatch } from '../background'
import { useUpdateTripChatBackground } from '../hooks'

type ChatBackgroundPickerProps = {
  tripId: string
  currentPreset: ChatBackground
  currentPath: string | null
  hasImage: boolean
}

const labelKeys: Record<ChatBackground, TranslationKey> = {
  default: 'chat.backgroundDefault',
  sunset: 'chat.backgroundSunset',
  mint: 'chat.backgroundMint',
  lavender: 'chat.backgroundLavender',
}

export function ChatBackgroundPicker({
  tripId,
  currentPreset,
  currentPath,
  hasImage,
}: ChatBackgroundPickerProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const updateBackground = useUpdateTripChatBackground(tripId)

  const apply = async (preset: ChatBackground, file?: File | null) => {
    setError(null)
    try {
      await updateBackground.mutateAsync({
        preset,
        file,
        currentPath,
      })
      toast.success(t('chat.backgroundUpdated'))
      setOpen(false)
    } catch (updateError) {
      const message = getErrorMessage(updateError, t('chat.backgroundError'))
      setError(message)
      toast.error(message)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen(true)}
        leftIcon={<Palette className="h-3.5 w-3.5" />}
        aria-label={t('chat.background')}
      >
        <span className="hidden sm:inline">{t('chat.background')}</span>
      </Button>

      <Modal
        open={open}
        onClose={() => {
          if (!updateBackground.isPending) setOpen(false)
        }}
        title={t('chat.background')}
        description={t('chat.backgroundBody')}
        size="sm"
      >
        <div className="grid grid-cols-2 gap-3">
          {CHAT_BACKGROUND_OPTIONS.map((preset) => {
            const active = !hasImage && currentPreset === preset
            return (
              <button
                key={preset}
                type="button"
                onClick={() => void apply(preset)}
                disabled={updateBackground.isPending}
                className={cn(
                  'group overflow-hidden rounded-2xl border p-1.5 text-left transition disabled:opacity-60',
                  active
                    ? 'border-coral-400 bg-coral-50 ring-2 ring-coral-100'
                    : 'border-border bg-white/70 hover:border-coral-200',
                )}
              >
                <span
                  className="block h-20 rounded-xl border border-white/70"
                  style={getChatBackgroundSwatch(preset)}
                  aria-hidden="true"
                />
                <span className="mt-1.5 block px-1.5 pb-1 text-xs font-bold text-ink">
                  {t(labelKeys[preset])}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 space-y-2">
          <input
            ref={fileInput}
            type="file"
            accept={IMAGE_ACCEPT}
            className="sr-only"
            aria-label={t('chat.backgroundUpload')}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (file) void apply('default', file)
            }}
          />
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => fileInput.current?.click()}
            isLoading={updateBackground.isPending}
            leftIcon={<ImagePlus className="h-4 w-4" />}
          >
            {t('chat.backgroundUpload')}
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => void apply('default', null)}
            disabled={updateBackground.isPending || (!hasImage && currentPreset === 'default')}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            {t('chat.backgroundReset')}
          </Button>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-xs font-semibold text-rose-600">
            {error}
          </p>
        ) : null}
      </Modal>
    </>
  )
}
