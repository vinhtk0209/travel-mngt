import { z } from 'zod'
import { translate } from '@/i18n/translate'

const optionalDate = z
  .string()
  .optional()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    error: () => translate('validation.trip.dateInvalid'),
  })

export const tripFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { error: () => translate('validation.trip.nameMin') })
      .max(80, { error: () => translate('validation.trip.nameMax') }),
    destination: z
      .string()
      .trim()
      .max(120, { error: () => translate('validation.trip.destinationMax') })
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, { error: () => translate('validation.trip.descriptionMax') })
      .optional(),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine(
    (values) => {
      if (!values.startDate || !values.endDate) return true
      return values.endDate >= values.startDate
    },
    {
      error: () => translate('validation.trip.endAfterStart'),
      path: ['endDate'],
    },
  )

export type TripFormValues = z.infer<typeof tripFormSchema>
