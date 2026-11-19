import { z } from 'zod'
import { isGoogleMapsUrl } from '@/services/google-maps'
import { translate } from '@/i18n/translate'

export const placeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: () => translate('validation.place.nameMin') })
    .max(120, { error: () => translate('validation.place.nameMax') }),
  address: z
    .string()
    .trim()
    .max(300, { error: () => translate('validation.place.addressMax') })
    .optional(),
  googleMapsUrl: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || isGoogleMapsUrl(value), {
      error: () => translate('validation.place.mapsInvalid'),
    }),
  notes: z
    .string()
    .trim()
    .max(2000, { error: () => translate('validation.place.notesMax') })
    .optional(),
  status: z.enum(['todo', 'completed']),
})

export type PlaceFormValues = z.infer<typeof placeFormSchema>
