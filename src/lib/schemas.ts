import { z } from 'zod'

const COAT_IDS = [
  'orange',
  'black',
  'white',
  'grey',
  'tuxedo',
  'calico',
  'tabby',
  'cream',
] as const

const MIN_DATE = '1990-01-01'

export const catInputSchema = z.object({
  name: z.string().trim().min(1, 'Your cat needs a name.').max(40),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please pick a valid birthday.')
    .refine((d) => d >= MIN_DATE, 'Cats do not live that long — try after 1990.')
    .refine(
      (d) => d <= new Date().toISOString().slice(0, 10),
      'That birthday is in the future.',
    ),
  photoUrl: z
    .string()
    .max(600)
    .refine(
      (u) => u.startsWith('/uploads/') || /^https:\/\//.test(u),
      'Invalid photo.',
    ),
  bio: z.string().trim().max(280).optional(),
  coat: z.enum(COAT_IDS).optional(),
})

export type CatInput = z.infer<typeof catInputSchema>

export const catUpdateSchema = catInputSchema.extend({
  slug: z.string().min(1),
  token: z.string().min(10),
})

export const catTokenSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(10),
})
