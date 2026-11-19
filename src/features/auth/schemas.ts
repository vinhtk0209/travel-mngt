import { z } from 'zod'
import { translate } from '@/i18n/translate'

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { error: () => translate('validation.auth.nameMin') })
    .max(60, { error: () => translate('validation.auth.nameMax') }),
})

export type ProfileValues = z.infer<typeof profileSchema>
