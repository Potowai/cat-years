import { z } from 'zod'
import { MAX_PHOTOS } from './types'

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

const photoUrlSchema = z
  .string()
  .max(600)
  .refine(
    (u) => u.startsWith('/uploads/') || /^https:\/\//.test(u),
    'Invalid photo.',
  )

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
  photos: z
    .array(photoUrlSchema)
    .min(1, 'Add at least one photo.')
    .max(MAX_PHOTOS, `Up to ${MAX_PHOTOS} photos per cat.`),
  bio: z.string().trim().max(280).optional(),
  coat: z.enum(COAT_IDS).optional(),
})

export type CatInput = z.infer<typeof catInputSchema>

const ownerTokenSchema = z.string().trim().min(10).max(200)

export const catCreateSchema = catInputSchema.extend({
  ownerToken: ownerTokenSchema.optional(),
  ownerName: z.string().trim().max(40).optional(),
})

export const catUpdateSchema = catInputSchema.extend({
  slug: z.string().min(1),
  token: z.string().min(10),
})

export const ownerListSchema = z.object({ ownerToken: ownerTokenSchema })

export const ownerNameSchema = z.object({
  ownerToken: ownerTokenSchema,
  ownerName: z.string().trim().max(40),
})

export const claimCatSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(10),
  ownerToken: ownerTokenSchema,
  ownerName: z.string().trim().max(40).optional(),
})

/**
 * Deleting is keyed by slug (the public identifier used in URLs), not the uuid.
 * The token still authorises it.
 */
export const catDeleteSchema = z.object({
  slug: z.string().min(1),
  token: z.string().min(10),
})
