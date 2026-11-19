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
import {
  IMAGE_ACCEPT,
  MAX_IMAGES_PER_PLACE,
  formatFileSize,
  validateImageFile,
} from '@/utils/image'
import { getErrorMessage } from '@/utils/errors'
import { useI18n } from '@/i18n/i18n-context'
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
  const { t } = useI18n()
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

    const accepted: File[] = []
    const rejected: string[] = []
    for (const file of Array.from(incoming)) {
      const problem = validateImageFile(file)
      if (problem) {
        rejected.push(`${file.name}: ${problem}`)
        continue
      }
      accepted.push(file)
    }

    const room = Math.max(0, MAX_IMAGES_PER_PLACE - visibleExistingImages.length - files.length)
    const toAdd = accepted.slice(0, room)
    if (accepted.length > room) {
      toast.error(t('placeForm.photoLimit', { max: MAX_IMAGES_PER_PLACE }))
    }
    if (rejected.length > 0) {
      toast.error(rejected[0])
    }
    if (toAdd.length > 0) {
      setFiles((current) => [...current, ...toAdd])
    }
  }

  const nextImageOrder = item
    ? item.images.reduce((max, image) => Math.max(max, image.sort_order + 1), 0)
    : 0

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
          nextImageOrder,
          removedImages:
            item.images.filter((image) => removedImageIds.has(image.id)),
        })
        toast.success(t('placeForm.updated'))
      } else {
        await createPlace.mutateAsync({
          values: { ...values, tagIds: selectedTagIds },
          files,
        })
        toast.success(t('placeForm.added'))
      }
      onClose()
    } catch (error) {
      setServerError(getErrorMessage(error, t('placeForm.saveError')))
    }
  })

  const isBusy = createPlace.isPending || updatePlace.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t('placeForm.editTitle') : t('placeForm.addTitle')}
      description={isEditing ? t('placeForm.editDescription') : t('placeForm.addDescription')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            {t('placeForm.cancel')}
          </Button>
          <Button type="submit" form="place-form" isLoading={isBusy}>
            {isEditing ? t('placeForm.save') : t('placeForm.add')}
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

        <Field label={t('placeForm.name')} htmlFor="place-name" error={errors.name?.message} required>
          <Input
            id="place-name"
            placeholder={t('placeForm.namePlaceholder')}
            {...register('name')}
          />
        </Field>

        <Field
          label={t('placeForm.address')}
          htmlFor="place-address"
          error={errors.address?.message}
          hint={t('placeForm.addressHint')}
        >
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-400" />
            <Input
              id="place-address"
              className="pl-10"
              placeholder={t('placeForm.addressPlaceholder')}
              {...register('address')}
            />
          </div>
        </Field>

        <Field
          label={t('placeForm.mapsUrl')}
          htmlFor="place-maps"
          error={errors.googleMapsUrl?.message}
          hint={t('placeForm.mapsHint')}
        >
          <Input
            id="place-maps"
            placeholder={t('placeForm.mapsPlaceholder')}
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
            <ExternalLink className="h-3.5 w-3.5" /> {t('placeForm.testMaps')}
          </a>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <Field label={t('placeForm.notes')} htmlFor="place-notes" error={errors.notes?.message}>
            <Textarea
              id="place-notes"
              rows={3}
              placeholder={t('placeForm.notesPlaceholder')}
              {...register('notes')}
            />
          </Field>

          <Field label={t('placeForm.status')} htmlFor="place-status" error={errors.status?.message}>
            <Select id="place-status" {...register('status')}>
              <option value="todo">{t('placeForm.todo')}</option>
              <option value="completed">{t('placeForm.completed')}</option>
            </Select>
          </Field>
        </div>

        <Field label={t('placeForm.tags')}>
          <TagMultiSelect
            tripId={tripId}
            tags={tags}
            selectedIds={selectedTagIds}
            onChange={setSelectedTagIds}
            canEdit
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-bold text-ink-soft">{t('placeForm.photos')}</p>

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
                    aria-label={t('placeForm.removeFile', { name: image.file_name })}
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
                    aria-label={t('placeForm.removeFile', { name: preview.name })}
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
            <ImagePlus className="h-5 w-5" /> {t('placeForm.addPhotos')}
          </button>
          <p className="mt-1.5 text-xs text-ink-muted">
            {t('placeForm.photosHint', { max: MAX_IMAGES_PER_PLACE })}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={IMAGE_ACCEPT}
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
