import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import * as repo from '~/db/cats.server'
import {
  catCreateSchema,
  catDeleteSchema,
  catUpdateSchema,
  claimCatSchema,
  ownerListSchema,
  ownerNameSchema,
} from '~/lib/schemas'
import { hashToken } from '~/lib/tokens'
import { ipHashFromRequest } from '~/server/request'

const sortSchema = z.object({
  sort: z
    .enum(['newest', 'oldest', 'senior', 'popular', 'name'])
    .default('newest'),
})

export const listCatsFn = createServerFn({ method: 'GET' })
  .validator(sortSchema)
  .handler(async ({ data }) => repo.listCats(data.sort))

/** Wall totals, computed over every cat rather than the displayed page. */
export const getWallStatsFn = createServerFn({ method: 'GET' }).handler(
  async () => repo.getWallStats(),
)

export const getCatFn = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => repo.getCatBySlug(data.slug))

export const createCatFn = createServerFn({ method: 'POST' })
  .validator(catCreateSchema)
  .handler(async ({ data }) => {
    const ipHash = await ipHashFromRequest()
    const { ownerToken, ownerName, ...cat } = data
    return repo.createCat({
      ...cat,
      ipHash,
      ownerTokenHash: ownerToken ? await hashToken(ownerToken) : undefined,
      ownerName,
    })
  })

/**
 * Every cat belonging to one owner token (used by the "my cats" page).
 *
 * POST, not GET: TanStack Start puts a GET server function's payload in the
 * query string, which would spill this bearer token into access logs.
 */
export const listMyCatsFn = createServerFn({ method: 'POST' })
  .validator(ownerListSchema)
  .handler(async ({ data }) => repo.listCatsByOwner(data.ownerToken))

/** Attaches an existing cat to the browser's owner token, proving it with the cat's own token. */
export const claimCatFn = createServerFn({ method: 'POST' })
  .validator(claimCatSchema)
  .handler(async ({ data }) => repo.claimCat(data))

/** Sets the owner's public pseudo across all of their cats. */
export const setOwnerNameFn = createServerFn({ method: 'POST' })
  .validator(ownerNameSchema)
  .handler(async ({ data }) => ({
    updated: await repo.setOwnerName(data),
  }))

export const updateCatFn = createServerFn({ method: 'POST' })
  .validator(catUpdateSchema)
  .handler(async ({ data }) => repo.updateCat(data))

export const deleteCatFn = createServerFn({ method: 'POST' })
  .validator(catDeleteSchema)
  .handler(async ({ data }) => {
    await repo.deleteCat({ slug: data.slug, token: data.token })
    return { ok: true }
  })

/** Purrs are batched client-side, so one call may carry a burst of taps. */
const purrSchema = z.object({
  slug: z.string().min(1),
  count: z.number().int().min(1).max(100).default(1),
})

export const purrCatFn = createServerFn({ method: 'POST' })
  .validator(purrSchema)
  .handler(async ({ data }) => {
    const ipHash = await ipHashFromRequest()
    return repo.purrCat(data.slug, ipHash, data.count)
  })
