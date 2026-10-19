import { and, asc, desc, eq, gt, inArray, isNull, like, sql } from 'drizzle-orm'
import { computeCatAge } from '~/lib/catAge'
import { ERR } from '~/lib/errors'
import { constantTimeEqual, createToken, hashToken } from '~/lib/tokens'
import { MAX_PHOTOS, type CatDTO, type CatSort } from '~/lib/types'
import { slugify } from '~/lib/utils'
import { getDb } from './client.server'
import { cats, photoUploads, purrs, type CatRow } from './schema'

/**
 * Anti-abuse caps so nobody can carpet the wall with cats. All are overridable
 * with environment variables (see README).
 */
const LIMITS = {
  total: Number(process.env.MAX_TOTAL_CATS ?? 20_000),
  per10min: Number(process.env.MAX_CATS_PER_10MIN ?? 6),
  perHour: Number(process.env.MAX_CATS_PER_HOUR ?? 15),
  perDay: Number(process.env.MAX_CATS_PER_DAY ?? 30),
  uploadsPer10min: Number(process.env.MAX_UPLOADS_PER_10MIN ?? 20),
  uploadsPerDay: Number(process.env.MAX_UPLOADS_PER_DAY ?? 120),
  purrsPerMinute: Number(process.env.MAX_PURRS_PER_MIN ?? 100),
}

function toDTO(row: CatRow): CatDTO {
  const photos =
    row.photos && row.photos.length > 0 ? row.photos : [row.photoUrl]
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    birthdate: row.birthdate,
    photoUrl: photos[0],
    photos,
    bio: row.bio,
    coat: row.coat,
    ownerName: row.ownerName,
    purrs: row.purrs,
    createdAt: row.createdAt.toISOString(),
  }
}

/** All photos of a row, tolerating older rows that only have `photo_url`. */
function photosOf(row: CatRow): string[] {
  const photos = row.photos && row.photos.length > 0 ? row.photos : [row.photoUrl]
  return photos.filter(Boolean)
}

/** Postgres unique-constraint violation (23505). */
function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  if (code === '23505') return true
  const message = error instanceof Error ? error.message : String(error)
  return /duplicate key value|unique constraint/i.test(message)
}

function orderFor(sort: CatSort) {
  switch (sort) {
    case 'oldest':
      return asc(cats.createdAt)
    case 'senior':
      return asc(cats.birthdate)
    case 'popular':
      return desc(cats.purrs)
    case 'name':
      return asc(cats.name)
    default:
      return desc(cats.createdAt)
  }
}

export async function listCats(sort: CatSort = 'newest'): Promise<CatDTO[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(cats)
    .orderBy(orderFor(sort), desc(cats.createdAt))
    .limit(500)
  return rows.map(toDTO)
}

export async function getCatBySlug(slug: string): Promise<CatDTO | null> {
  const db = await getDb()
  const rows = await db.select().from(cats).where(eq(cats.slug, slug)).limit(1)
  return rows[0] ? toDTO(rows[0]) : null
}

export async function countAllCats(): Promise<number> {
  const db = await getDb()
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(cats)
  return rows[0]?.count ?? 0
}

/**
 * Headline numbers for the wall.
 *
 * Computed from every row rather than the page of 500 that `listCats` returns,
 * so the totals stay honest once the wall grows past the display cap. The age
 * maths is left to `computeCatAge` so it cannot drift from the JS formula.
 */
export type WallStats = {
  cats: number
  purrs: number
  avgHumanYears: number
  oldestHumanYears: number
}

export async function getWallStats(): Promise<WallStats> {
  const db = await getDb()
  const rows = await db
    .select({ birthdate: cats.birthdate, purrs: cats.purrs })
    .from(cats)

  let purrsTotal = 0
  let humanSum = 0
  let oldest = 0
  for (const row of rows) {
    purrsTotal += row.purrs
    const { humanYears } = computeCatAge(row.birthdate)
    humanSum += humanYears
    if (humanYears > oldest) oldest = humanYears
  }

  return {
    cats: rows.length,
    purrs: purrsTotal,
    avgHumanYears: rows.length > 0 ? humanSum / rows.length : 0,
    oldestHumanYears: oldest,
  }
}

// --- Photo ownership -----------------------------------------------------
// `photo_uploads` records every URL this app has issued. A URL may be attached
// to exactly one cat, and storage cleanup only ever touches URLs owned by the
// cat being edited — so a client can never aim a delete at someone else's blob.

/** Called by the upload endpoint once the bytes are safely stored. */
export async function recordPhotoUpload(
  url: string,
  ipHash?: string | null,
): Promise<void> {
  const db = await getDb()
  await db
    .insert(photoUploads)
    .values({ url, ipHash: ipHash ?? null })
    .onConflictDoNothing()
}

export async function countRecentUploadsByIp(
  ipHash: string,
  windowMinutes: number,
): Promise<number> {
  const db = await getDb()
  const since = new Date(Date.now() - windowMinutes * 60_000)
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(photoUploads)
    .where(
      and(eq(photoUploads.ipHash, ipHash), gt(photoUploads.createdAt, since)),
    )
  return rows[0]?.count ?? 0
}

/** True when this caller has used up its anonymous upload allowance. */
export async function uploadQuotaExceeded(ipHash: string): Promise<boolean> {
  const [recent, today] = await Promise.all([
    countRecentUploadsByIp(ipHash, 10),
    countRecentUploadsByIp(ipHash, 60 * 24),
  ])
  return recent >= LIMITS.uploadsPer10min || today >= LIMITS.uploadsPerDay
}

async function photosOwnedBy(catId: string): Promise<string[]> {
  const db = await getDb()
  const rows = await db
    .select({ url: photoUploads.url })
    .from(photoUploads)
    .where(eq(photoUploads.catId, catId))
  return rows.map((row) => row.url)
}

/** The invariant shared by create and update: only an unclaimed upload may be attached. */
function isUnclaimed(url: string) {
  return and(eq(photoUploads.url, url), isNull(photoUploads.catId))
}

/** Derives a free slug from an already-slugified base. */
function pickSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export async function createCat(input: {
  name: string
  birthdate: string
  photos: string[]
  bio?: string
  coat?: string
  ipHash?: string
  ownerTokenHash?: string
  ownerName?: string
}): Promise<{ cat: CatDTO; token: string }> {
  const db = await getDb()
  const id = crypto.randomUUID()
  const token = createToken()
  const tokenHash = await hashToken(token)
  const photos = input.photos.slice(0, MAX_PHOTOS)
  // The request schema already requires one photo; guard the direct callers too.
  if (photos.length === 0) throw new Error(ERR.NO_PHOTO)
  const lockKey = input.ipHash ?? 'anonymous'

  // Names may repeat, so two concurrent inserts can race for the same slug.
  // A failed statement aborts its whole transaction in Postgres, so the retry
  // wraps the transaction instead of living inside it.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        // Serialise the limit check and the insert so parallel requests cannot
        // all pass the window checks before any of them lands.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${lockKey})::bigint)`,
        )

        const total = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(cats)
        if ((total[0]?.count ?? 0) >= LIMITS.total) {
          throw new Error(ERR.TOO_MANY_CATS)
        }

        if (input.ipHash) {
          const since = (minutes: number) =>
            new Date(Date.now() - minutes * 60_000)
          const countSince = async (minutes: number) => {
            const rows = await tx
              .select({ count: sql<number>`count(*)::int` })
              .from(cats)
              .where(
                and(
                  eq(cats.ipHash, input.ipHash as string),
                  gt(cats.createdAt, since(minutes)),
                ),
              )
            return rows[0]?.count ?? 0
          }
          const recent = await countSince(10)
          const lastHour = await countSince(60)
          const lastDay = await countSince(60 * 24)
          if (
            recent >= LIMITS.per10min ||
            lastHour >= LIMITS.perHour ||
            lastDay >= LIMITS.perDay
          ) {
            throw new Error(ERR.RATE_LIMITED)
          }
        }

        const base = slugify(input.name)
        const takenRows = await tx
          .select({ slug: cats.slug })
          .from(cats)
          .where(like(cats.slug, `${base}%`))
        const slug = pickSlug(base, new Set(takenRows.map((r) => r.slug)))

        const rows = await tx
          .insert(cats)
          .values({
            id,
            name: input.name,
            slug,
            birthdate: input.birthdate,
            photoUrl: photos[0],
            photos,
            bio: input.bio?.trim() ? input.bio.trim() : null,
            coat: input.coat ?? null,
            editTokenHash: tokenHash,
            ownerTokenHash: input.ownerTokenHash ?? null,
            ownerName: input.ownerName?.trim() ? input.ownerName.trim() : null,
            ipHash: input.ipHash ?? null,
          })
          .returning()

        // Only URLs this app issued, and only if nobody else has claimed them.
        for (const url of photos) {
          const claimed = await tx
            .update(photoUploads)
            .set({ catId: id })
            .where(isUnclaimed(url))
            .returning({ url: photoUploads.url })
          if (claimed.length === 0) throw new Error(ERR.PHOTO_NOT_YOURS)
        }

        return { cat: toDTO(rows[0]), token }
      })
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
    }
  }
  throw new Error(ERR.GENERIC)
}

async function assertOwner(slug: string, token: string): Promise<CatRow> {
  const db = await getDb()
  const rows = await db.select().from(cats).where(eq(cats.slug, slug)).limit(1)
  const row = rows[0]
  if (!row) throw new Error(ERR.CAT_GONE)
  const hash = await hashToken(token)
  // Either the per-cat token or the owner-wide token grants access.
  const matches =
    constantTimeEqual(hash, row.editTokenHash) ||
    (row.ownerTokenHash !== null &&
      constantTimeEqual(hash, row.ownerTokenHash))
  if (!matches) {
    throw new Error(ERR.NOT_OWNER)
  }
  return row
}

/** Every cat added by one owner token, newest first. */
export async function listCatsByOwner(
  ownerToken: string,
): Promise<CatDTO[]> {
  const db = await getDb()
  const hash = await hashToken(ownerToken)
  const rows = await db
    .select()
    .from(cats)
    .where(eq(cats.ownerTokenHash, hash))
    .orderBy(desc(cats.createdAt))
    .limit(200)
  return rows.map(toDTO)
}

/**
 * Attaches a cat to an owner token, proven with that cat's own token. Used to
 * bring cats created before owner tokens existed under one owner.
 */
export async function claimCat(input: {
  id: string
  token: string
  ownerToken: string
  ownerName?: string
}): Promise<CatDTO | null> {
  const db = await getDb()
  const found = await db
    .select()
    .from(cats)
    .where(eq(cats.id, input.id))
    .limit(1)
  const row = found[0]
  if (!row) return null
  const hash = await hashToken(input.token)
  if (!constantTimeEqual(hash, row.editTokenHash)) {
    throw new Error(ERR.NOT_OWNER)
  }
  const ownerHash = await hashToken(input.ownerToken)
  if (row.ownerTokenHash === ownerHash) return toDTO(row)
  const rows = await db
    .update(cats)
    .set({
      ownerTokenHash: ownerHash,
      ownerName: input.ownerName?.trim()
        ? input.ownerName.trim()
        : row.ownerName,
    })
    .where(eq(cats.id, input.id))
    .returning()
  return toDTO(rows[0])
}

/** Sets the public pseudo for every cat of one owner. */
export async function setOwnerName(input: {
  ownerToken: string
  ownerName: string
}): Promise<number> {
  const db = await getDb()
  const hash = await hashToken(input.ownerToken)
  const rows = await db
    .update(cats)
    .set({ ownerName: input.ownerName.trim() || null })
    .where(eq(cats.ownerTokenHash, hash))
    .returning({ id: cats.id })
  return rows.length
}

export async function updateCat(input: {
  slug: string
  token: string
  name: string
  birthdate: string
  photos: string[]
  bio?: string
  coat?: string
}): Promise<CatDTO> {
  const db = await getDb()
  const previous = await assertOwner(input.slug, input.token)
  const photos = input.photos.slice(0, MAX_PHOTOS)
  const previousPhotos = photosOf(previous)
  const owned = new Set(await photosOwnedBy(previous.id))

  // Photos already on this cat stay usable (legacy rows predate the upload
  // ledger); anything new must be an unclaimed upload of ours.
  for (const url of photos) {
    if (previousPhotos.includes(url)) continue
    const claimed = await db
      .update(photoUploads)
      .set({ catId: previous.id })
      .where(isUnclaimed(url))
      .returning({ url: photoUploads.url })
    if (claimed.length === 0) throw new Error(ERR.PHOTO_NOT_YOURS)
  }

  const rows = await db
    .update(cats)
    .set({
      name: input.name,
      birthdate: input.birthdate,
      photoUrl: photos[0],
      photos,
      bio: input.bio?.trim() ? input.bio.trim() : null,
      coat: input.coat ?? null,
    })
    .where(eq(cats.slug, input.slug))
    .returning()

  // Photos the owner removed should not linger in storage — but only the ones
  // this app actually issued for this cat.
  const kept = new Set(photos)
  const removed = previousPhotos.filter((url) => !kept.has(url) && owned.has(url))
  await removeBlobPhotos(removed)
  if (removed.length > 0) {
    await db
      .delete(photoUploads)
      .where(
        and(
          eq(photoUploads.catId, previous.id),
          inArray(photoUploads.url, removed),
        ),
      )
  }

  return toDTO(rows[0])
}

/**
 * Best-effort removal of a cat's photos from Vercel Blob. Callers must pass
 * only URLs recorded as belonging to that cat; local `/uploads/...` paths are
 * left alone, and failures never block the delete.
 */
async function removeBlobPhotos(urls: string[]): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return
  const targets = urls.filter((u) => /^https:\/\//.test(u))
  if (targets.length === 0) return
  try {
    const { del } = await import('@vercel/blob')
    await del(targets)
  } catch {
    /* storage cleanup is best-effort */
  }
}

export async function deleteCat(input: {
  slug: string
  token: string
}): Promise<void> {
  const db = await getDb()
  const row = await assertOwner(input.slug, input.token)
  const owned = await photosOwnedBy(row.id)
  await db.delete(cats).where(eq(cats.slug, input.slug))
  await removeBlobPhotos(owned)
}

/**
 * Purring is unlimited but rate limited: a visitor gets `LIMITS.purrsPerMinute`
 * purrs per cat per rolling minute, then has to wait it out. A burst that
 * crosses the line still banks the purrs that fit and reports `limited`.
 *
 * One row per (cat, visitor) tracks what has been spent in the current window.
 * `onConflictDoNothing` then `SELECT … FOR UPDATE` serialises concurrent clicks
 * without a read-then-insert race.
 */
export async function purrCat(
  slug: string,
  ipHash: string,
  amount = 1,
): Promise<{
  purrs: number
  applied: number
  limited: boolean
  retryAfterMs: number
}> {
  const db = await getDb()
  const found = await db
    .select({ id: cats.id, purrs: cats.purrs })
    .from(cats)
    .where(eq(cats.slug, slug))
    .limit(1)
  const cat = found[0]
  if (!cat) throw new Error(ERR.CAT_GONE)

  const n = Math.max(1, Math.floor(amount))
  const limit = LIMITS.purrsPerMinute
  const now = new Date()

  const result = await db.transaction(async (tx) => {
    const where = and(eq(purrs.catId, cat.id), eq(purrs.ipHash, ipHash))

    // Make sure the row exists, then lock it. Doing it in this order means a
    // concurrent first-ever purr waits here instead of racing the insert.
    await tx
      .insert(purrs)
      .values({ catId: cat.id, ipHash, count: 0, windowStartedAt: now })
      .onConflictDoNothing()

    const [row] = await tx
      .select({ count: purrs.count, windowStartedAt: purrs.windowStartedAt })
      .from(purrs)
      .where(where)
      .for('update')
    if (!row) return { applied: 0, purrs: cat.purrs, retryAfterMs: 0 }

    const windowOpen = now.getTime() - row.windowStartedAt.getTime() < 60_000
    const spent = windowOpen ? row.count : 0
    const room = Math.min(n, Math.max(0, limit - spent))
    const retryAfterMs = windowOpen
      ? Math.max(0, row.windowStartedAt.getTime() + 60_000 - now.getTime())
      : 60_000
    if (room === 0) return { applied: 0, purrs: cat.purrs, retryAfterMs }

    await tx
      .update(purrs)
      .set({
        count: spent + room,
        windowStartedAt: windowOpen ? row.windowStartedAt : now,
      })
      .where(where)

    const rows = await tx
      .update(cats)
      .set({ purrs: sql`${cats.purrs} + ${room}` })
      .where(eq(cats.id, cat.id))
      .returning({ purrs: cats.purrs })

    return {
      applied: room,
      purrs: rows[0]?.purrs ?? cat.purrs + room,
      retryAfterMs: room < n ? retryAfterMs : 0,
    }
  })

  return {
    ...result,
    limited: result.applied < n,
  }
}
