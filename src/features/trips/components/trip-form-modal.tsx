import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, CalendarDays, ImagePlus, MapPin, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { useSignedImageUrls } from '@/features/images/hooks'
import { useI18n } from '@/i18n/i18n-context'
import { getErrorMessage } from '@/utils/errors'
import { IMAGE_ACCEPT, validateImageFile } from '@/utils/image'
import { useCreateTrip, useUpdateTrip } from '../hooks'
import { tripFormSchema, type TripFormValues } from '../schemas'
import type { Trip } from '../types'

type TripFormModalProps = {
  open: boolean
  onClose: () => void
  trip?: Trip | null
  initialValues?: Partial<TripFormValues>
}

export function TripFormModal({ open, onClose, trip, initialValues }: TripFormModalProps) {
  const { t } = useI18n()
  const isEditing = Boolean(trip)
  const createTrip = useCreateTrip()
  const updateTrip = useUpdateTrip(trip?.id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [removeCover, setRemoveCover] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { urls } = useSignedImageUrls([trip?.cover_image])
  const existingCoverUrl = removeCover ? undefined : trip?.cover_image ? urls[trip.cover_image] : undefined

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      name: '',
      destination: '',
      description: '',
      startDate: '',
      endDate: '',
    },
  })

  useEffect(() => {
    if (!open) return
    setCoverFile(null)
    setCoverPreview(null)
    setRemoveCover(false)
    setServerError(null)
    reset({
      name: trip?.name ?? initialValues?.name ?? '',
      destination: trip?.destination ?? initialValues?.destination ?? '',
      description: trip?.description ?? initialValues?.description ?? '',
      startDate: trip?.start_date ?? initialValues?.startDate ?? '',
      endDate: trip?.end_date ?? initialValues?.endDate ?? '',
    })
  }, [open, trip, reset, initialValues])

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null)
      return
    }
    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  const previewUrl = coverPreview ?? existingCoverUrl ?? null

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      if (isEditing && trip) {
        await updateTrip.mutateAsync({
          values,
          coverFile,
          previousCoverPath: trip.cover_image,
          removeCover,
        })
        toast.success(t('tripForm.updated'))
      } else {
        await createTrip.mutateAsync({ values, coverFile })
        toast.success(t('tripForm.created'))
      }
      onClose()
    } catch (error) {
      setServerError(getErrorMessage(error, t('tripForm.saveError')))
    }
  })

  const isBusy = isSubmitting || createTrip.isPending || updateTrip.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t('tripForm.editTitle') : t('tripForm.newTitle')}
      description={
        isEditing ? t('tripForm.editDescription') : t('tripForm.newDescription')
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            {t('tripForm.cancel')}
          </Button>
          <Button type="submit" form="trip-form" isLoading={isBusy}>
            {isEditing ? t('tripForm.save') : t('tripForm.create')}
          </Button>
        </>
      }
    >
      <form id="trip-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        {serverError ? (
          <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-2xl border border-dashed border-coral-200 bg-cream/70">
          {previewUrl ? (
            <div className="relative h-40">
              <img src={previewUrl} alt={t('tripForm.coverPreview')} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-ink/50 to-transparent p-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" /> {t('tripForm.replace')}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setCoverFile(null)
                    setRemoveCover(true)
                  }}
                >
                  <Trash2 className="h-4 w-4" /> {t('tripForm.remove')}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-32 w-full flex-col items-center justify-center gap-2 text-ink-muted transition hover:text-coral-500"
            >
              <ImagePlus className="h-7 w-7" />
              <span className="text-sm font-bold">{t('tripForm.addCover')}</span>
              <span className="text-xs">{t('tripForm.coverHint')}</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              if (file) {
                const problem = validateImageFile(file)
                if (problem) {
                  toast.error(problem)
                  event.target.value = ''
                  return
                }
              }
              setCoverFile(file)
              setRemoveCover(false)
              event.target.value = ''
            }}
          />
        </div>

        <Field label={t('tripForm.name')} htmlFor="trip-name" error={errors.name?.message} required>
          <Input id="trip-name" placeholder={t('tripForm.namePlaceholder')} {...register('name')} />
        </Field>

        <Field label={t('tripForm.destination')} htmlFor="trip-destination" error={errors.destination?.message}>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
            <Input
              id="trip-destination"
              className="pl-10"
              placeholder={t('tripForm.destinationPlaceholder')}
              {...register('destination')}
            />
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('tripForm.startDate')} htmlFor="trip-start" error={errors.startDate?.message}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
              <Input
                id="trip-start"
                type="date"
                className="pl-10"
                {...register('startDate')}
              />
            </div>
          </Field>
          <Field label={t('tripForm.endDate')} htmlFor="trip-end" error={errors.endDate?.message}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
              <Input id="trip-end" type="date" className="pl-10" {...register('endDate')} />
            </div>
          </Field>
        </div>

        <Field
          label={t('tripForm.description')}
          htmlFor="trip-description"
          error={errors.description?.message}
          hint={t('tripForm.descriptionHint')}
        >
          <Textarea
            id="trip-description"
            placeholder={t('tripForm.descriptionPlaceholder')}
            {...register('description')}
          />
        </Field>
      </form>
    </Modal>
  )
}
