import { z } from 'zod'

const optionalDate = z
  .string()
  .optional()
  .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Choose a valid date')

export const tripFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Give your trip a name')
      .max(80, 'Keep the name under 80 characters'),
    destination: z
      .string()
      .trim()
      .max(120, 'Keep the destination under 120 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(2000, 'Keep the description under 2000 characters')
      .optional(),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine(
    (values) => {
      if (!values.startDate || !values.endDate) return true
      return values.endDate >= values.startDate
    },
    { message: 'End date must be after the start date', path: ['endDate'] },
  )

export type TripFormValues = z.infer<typeof tripFormSchema>
