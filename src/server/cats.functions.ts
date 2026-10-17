import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { z } from 'zod'
import * as repo from '~/db/cats.server'
import { ERR } from '~/lib/errors'
import { hashToken } from '~/lib/tokens'
import {
  catCreateSchema,
  catTokenSchema,
  catUpdateSchema,
  claimCatSchema,
  ownerListSchema,
  ownerNameSchema,
} from '~/lib/schemas'

const sortSchema = z.object({
  sort: z
    .enum(['newest', 'oldest', 'senior', 'popular', 'name'])
    .default('newest'),
})

/**
 * Anti-abuse caps so nobody can carpet the wall with cats. All are overridable
 * with environment variables (see README).
 */
const LIMITS = {
  total: Number(process.env.MAX_TOTAL_CATS ?? 20_000),
  per10min: Number(process.env.MAX_CATS_PER_10MIN ?? 6),
  perHour: Number(process.env.MAX_CATS_PER_HOUR ?? 15),
  perDay: Number(process.env.MAX_CATS_PER_DAY ?? 30),
}

async function enforceCreateLimits(ipHash: string | null): Promise<void> {
  const total = await repo.countAllCats()
  if (total >= LIMITS.total) {
    throw new Error(ERR.TOO_MANY_CATS)
  }
  if (!ipHash) return
  const [recent, lastHour, lastDay] = await Promise.all([
    repo.countRecentByIp(ipHash, 10),
    repo.countRecentByIp(ipHash, 60),
    repo.countRecentByIp(ipHash, 60 * 24),
  ])
  if (
    recent >= LIMITS.per10min ||
    lastHour >= LIMITS.perHour ||
    lastDay >= LIMITS.perDay
  ) {
    throw new Error(ERR.RATE_LIMITED)
  }
}

async function ipHashFromRequest(): Promise<string | null> {
  const forwarded = getRequestHeader('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    getRequestHeader('x-real-ip') ||
    'unknown'
  const salt = process.env.IP_SALT ?? 'cat-years'
  return hashToken(`${salt}:${ip}`)
}

export const listCatsFn = createServerFn({ method: 'GET' })
  .validator(sortSchema)
  .handler(async ({ data }) => repo.listCats(data.sort))

export const getCatFn = createServerFn({ method: 'GET' })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => repo.getCatBySlug(data.slug))

export const createCatFn = createServerFn({ method: 'POST' })
  .validator(catCreateSchema)
  .handler(async ({ data }) => {
    const ipHash = await ipHashFromRequest()
    await enforceCreateLimits(ipHash)
    const { ownerToken, ownerName, ...cat } = data
    return repo.insertCat({
      ...cat,
      ipHash: ipHash ?? undefined,
      ownerTokenHash: ownerToken ? await hashToken(ownerToken) : undefined,
      ownerName,
    })
  })

/** Every cat belonging to one owner token (used by the "my cats" page). */
export const listMyCatsFn = createServerFn({ method: 'GET' })
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
  .validator(catTokenSchema)
  .handler(async ({ data }) => {
    await repo.deleteCat({ slug: data.id, token: data.token })
    return { ok: true }
  })

export const purrCatFn = createServerFn({ method: 'POST' })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    const purrs = await repo.purrCat(data.slug)
    return { purrs }
  })
