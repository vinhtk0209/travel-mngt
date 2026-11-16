import { z } from 'zod'
import { isGoogleMapsUrl } from '@/services/google-maps'

export const placeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Give this place a name')
    .max(120, 'Keep the name under 120 characters'),
  address: z.string().trim().max(300, 'Keep the address under 300 characters').optional(),
  googleMapsUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || isGoogleMapsUrl(value),
      'Paste a valid Google Maps link (https://…google.com/maps/…)',
    ),
  notes: z.string().trim().max(2000, 'Keep notes under 2000 characters').optional(),
  status: z.enum(['todo', 'completed']),
})

export type PlaceFormValues = z.infer<typeof placeFormSchema>
