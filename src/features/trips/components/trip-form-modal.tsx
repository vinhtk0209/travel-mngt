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
import { getErrorMessage } from '@/utils/errors'
import { useCreateTrip, useUpdateTrip } from '../hooks'
import { tripFormSchema, type TripFormValues } from '../schemas'
import type { Trip } from '../types'

type TripFormModalProps = {
  open: boolean
  onClose: () => void
  trip?: Trip | null
}

export function TripFormModal({ open, onClose, trip }: TripFormModalProps) {
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
      name: trip?.name ?? '',
      destination: trip?.destination ?? '',
      description: trip?.description ?? '',
      startDate: trip?.start_date ?? '',
      endDate: trip?.end_date ?? '',
    })
  }, [open, trip, reset])

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
        toast.success('Trip updated')
      } else {
        await createTrip.mutateAsync({ values, coverFile })
        toast.success('Trip created. Time to dream a little!')
      }
      onClose()
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not save this trip'))
    }
  })

  const isBusy = isSubmitting || createTrip.isPending || updateTrip.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit trip' : 'Plan a new trip'}
      description={
        isEditing
          ? 'Tweak the details and keep the excitement going.'
          : 'Give this adventure a name, a place and a little shape.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button type="submit" form="trip-form" isLoading={isBusy}>
            {isEditing ? 'Save changes' : 'Create trip'}
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
              <img src={previewUrl} alt="Trip cover preview" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-ink/50 to-transparent p-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4" /> Replace
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
                  <Trash2 className="h-4 w-4" /> Remove
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
              <span className="text-sm font-bold">Add a cover image</span>
              <span className="text-xs">JPG, PNG, WEBP or GIF · up to 10 MB</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setCoverFile(file)
              setRemoveCover(false)
              event.target.value = ''
            }}
          />
        </div>

        <Field label="Trip name" htmlFor="trip-name" error={errors.name?.message} required>
          <Input id="trip-name" placeholder="Da Lat weekend escape" {...register('name')} />
        </Field>

        <Field label="Destination" htmlFor="trip-destination" error={errors.destination?.message}>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
            <Input
              id="trip-destination"
              className="pl-10"
              placeholder="Da Lat, Vietnam"
              {...register('destination')}
            />
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date" htmlFor="trip-start" error={errors.startDate?.message}>
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
          <Field label="End date" htmlFor="trip-end" error={errors.endDate?.message}>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
              <Input id="trip-end" type="date" className="pl-10" {...register('endDate')} />
            </div>
          </Field>
        </div>

        <Field
          label="Description"
          htmlFor="trip-description"
          error={errors.description?.message}
          hint="A little note about the vibe, the crew or the plan."
        >
          <Textarea
            id="trip-description"
            placeholder="Coffee, waterfalls, night markets and no alarms…"
            {...register('description')}
          />
        </Field>
      </form>
    </Modal>
  )
}
