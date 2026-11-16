import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ExternalLink, ImagePlus, MapPin, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useSignedImageUrls } from '@/features/images/hooks'
import { TagMultiSelect } from '@/features/tags/components/tag-multi-select'
import type { Tag } from '@/features/tags/api'
import { resolveGoogleMapsUrl } from '@/services/google-maps'
import { formatFileSize } from '@/utils/image'
import { getErrorMessage } from '@/utils/errors'
import { useCreatePlace, useUpdatePlace } from '../hooks'
import type { TripItemWithMeta } from '../api'
import { placeFormSchema, type PlaceFormValues } from '../schemas'

type PlaceFormModalProps = {
  open: boolean
  onClose: () => void
  tripId: string
  item?: TripItemWithMeta | null
  tags: Tag[]
}

export function PlaceFormModal({ open, onClose, tripId, item, tags }: PlaceFormModalProps) {
  const isEditing = Boolean(item)
  const createPlace = useCreatePlace(tripId)
  const updatePlace = useUpdatePlace(tripId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<Set<string>>(new Set())
  const [serverError, setServerError] = useState<string | null>(null)

  const visibleExistingImages =
    item?.images.filter((image) => !removedImageIds.has(image.id)) ?? []
  const { urls: existingUrls } = useSignedImageUrls(
    visibleExistingImages.map((image) => image.storage_path),
  )

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PlaceFormValues>({
    resolver: zodResolver(placeFormSchema),
    defaultValues: {
      name: '',
      address: '',
      googleMapsUrl: '',
      notes: '',
      status: 'todo',
    },
  })

  const address = useWatch({ control, name: 'address' })
  const googleMapsUrl = useWatch({ control, name: 'googleMapsUrl' })
  const previewMapsUrl = resolveGoogleMapsUrl({ googleMapsUrl, address })

  useEffect(() => {
    if (!open) return
    reset({
      name: item?.name ?? '',
      address: item?.address ?? '',
      googleMapsUrl: item?.google_maps_url ?? '',
      notes: item?.notes ?? '',
      status: item?.status ?? 'todo',
    })
    setSelectedTagIds(item?.tags.map((tag) => tag.id) ?? [])
    setFiles([])
    setRemovedImageIds(new Set())
    setServerError(null)
  }, [open, item, reset])

  useEffect(() => {
    const next = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }))
    setPreviews(next)
    return () => {
      next.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [files])

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return
    setFiles((current) => [...current, ...Array.from(incoming)])
  }

  const handleRemoveExistingImage = (imageId: string) => {
    setRemovedImageIds((current) => new Set(current).add(imageId))
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      if (isEditing && item) {
        await updatePlace.mutateAsync({
          itemId: item.id,
          values: { ...values, tagIds: selectedTagIds },
          files,
          existingImageCount: visibleExistingImages.length,
          removedImages:
            item.images.filter((image) => removedImageIds.has(image.id)),
        })
        toast.success('Place updated')
      } else {
        await createPlace.mutateAsync({
          values: { ...values, tagIds: selectedTagIds },
          files,
        })
        toast.success('Place added to your trip')
      }
      onClose()
    } catch (error) {
      setServerError(getErrorMessage(error, 'Could not save this place'))
    }
  })

  const isBusy = createPlace.isPending || updatePlace.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit place' : 'Add a place'}
      description={
        isEditing
          ? 'Keep the details fresh — your travel buddies will see the update.'
          : 'A restaurant, a viewpoint, a tiny coffee shop… collect it all.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          <Button type="submit" form="place-form" isLoading={isBusy}>
            {isEditing ? 'Save place' : 'Add place'}
          </Button>
        </>
      }
    >
      <form id="place-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        {serverError ? (
          <div className="flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm font-semibold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {serverError}
          </div>
        ) : null}

        <Field label="Place name" htmlFor="place-name" error={errors.name?.message} required>
          <Input
            id="place-name"
            placeholder="Little corner coffee shop"
            {...register('name')}
          />
        </Field>

        <Field
          label="Address"
          htmlFor="place-address"
          error={errors.address?.message}
          hint="Leave empty if you only know the name."
        >
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
            <Input
              id="place-address"
              className="pl-10"
              placeholder="27 Truc Lam, Da Lat"
              {...register('address')}
            />
          </div>
        </Field>

        <Field
          label="Google Maps URL"
          htmlFor="place-maps"
          error={errors.googleMapsUrl?.message}
          hint="Paste a Google Maps link, or leave blank and we will build a search link from the address."
        >
          <Input
            id="place-maps"
            placeholder="https://maps.app.goo.gl/…"
            {...register('googleMapsUrl')}
          />
        </Field>

        {previewMapsUrl ? (
          <a
            href={previewMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-mint-600 hover:text-mint-700"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Test this Maps link
          </a>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <Field label="Notes" htmlFor="place-notes" error={errors.notes?.message}>
            <Textarea
              id="place-notes"
              rows={3}
              placeholder="Get the coconut coffee, sit by the window…"
              {...register('notes')}
            />
          </Field>

          <Field label="Status" htmlFor="place-status" error={errors.status?.message}>
            <Select id="place-status" {...register('status')}>
              <option value="todo">To do</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>
        </div>

        <Field label="Tags">
          <TagMultiSelect
            tripId={tripId}
            tags={tags}
            selectedIds={selectedTagIds}
            onChange={setSelectedTagIds}
            canEdit
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-bold text-ink-soft">Photos</p>

          {visibleExistingImages.length > 0 ? (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {visibleExistingImages.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-cream"
                >
                  {existingUrls[image.storage_path] ? (
                    <img
                      src={existingUrls[image.storage_path]}
                      alt={image.file_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="checker h-full w-full" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(image.id)}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1.5 text-rose-500 shadow-sm transition hover:bg-rose-50"
                    aria-label={`Remove ${image.file_name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {previews.length > 0 ? (
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {previews.map((preview, index) => (
                <div
                  key={`${preview.name}-${index}`}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-cream"
                >
                  <img src={preview.url} alt={preview.name} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                    className="absolute right-1 top-1 rounded-full bg-white/90 p-1.5 text-ink-soft shadow-sm transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label={`Remove ${preview.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="absolute inset-x-1 bottom-1 truncate rounded-full bg-ink/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {formatFileSize(files[index]?.size ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-coral-200 bg-cream/60 py-5 text-sm font-bold text-ink-muted transition hover:border-coral-300 hover:text-coral-600"
          >
            <ImagePlus className="h-5 w-5" /> Add photos
          </button>
          <p className="mt-1.5 text-xs text-ink-muted">
            Photos are compressed in your browser and uploaded when you save.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </div>
      </form>
    </Modal>
  )
}
