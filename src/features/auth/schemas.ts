import { z } from 'zod'

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Tell us your name')
    .max(60, 'Keep it under 60 characters'),
})

export type ProfileValues = z.infer<typeof profileSchema>
