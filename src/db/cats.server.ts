import { and, asc, desc, eq, gt, like, sql } from 'drizzle-orm'
import { ERR } from '~/lib/errors'
import { hashToken } from '~/lib/tokens'
import { MAX_PHOTOS, type CatDTO, type CatSort } from '~/lib/types'
import { slugify } from '~/lib/utils'
import { getDb } from './client.server'
import { cats, type CatRow } from './schema'

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

async function uniqueSlug(name: string): Promise<string> {
  const db = await getDb()
  const base = slugify(name)
  const existing = await db
    .select({ slug: cats.slug })
    .from(cats)
    .where(like(cats.slug, `${base}%`))
  const taken = new Set(existing.map((r) => r.slug))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

export async function countRecentByIp(
  ipHash: string,
  windowMinutes = 10,
): Promise<number> {
  const db = await getDb()
  const since = new Date(Date.now() - windowMinutes * 60_000)
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(cats)
    .where(and(eq(cats.ipHash, ipHash), gt(cats.createdAt, since)))
  return rows[0]?.count ?? 0
}

export async function countAllCats(): Promise<number> {
  const db = await getDb()
  const rows = await db.select({ count: sql<number>`count(*)::int` }).from(cats)
  return rows[0]?.count ?? 0
}

export async function insertCat(input: {
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
  const token = crypto.randomUUID().replace(/-/g, '') + id.replace(/-/g, '')
  const tokenHash = await hashToken(token)
  const photos = input.photos.slice(0, MAX_PHOTOS)

  // Names may repeat: `uniqueSlug` derives a free slug, and we retry on the
  // rare race where two inserts pick the same slug at the same moment.
  let lastError: unknown
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const slug = await uniqueSlug(input.name)
    try {
      const rows = await db
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
      return { cat: toDTO(rows[0]), token }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error(ERR.GENERIC)
}

async function assertOwner(slug: string, token: string): Promise<CatRow> {
  const db = await getDb()
  const rows = await db.select().from(cats).where(eq(cats.slug, slug)).limit(1)
  const row = rows[0]
  if (!row) throw new Error(ERR.CAT_GONE)
  const hash = await hashToken(token)
  // Either the per-cat token or the owner-wide token grants access.
  if (hash !== row.editTokenHash && hash !== row.ownerTokenHash) {
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
  if (hash !== row.editTokenHash) throw new Error(ERR.NOT_OWNER)
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

  // Photos the owner removed should not linger in storage.
  const kept = new Set(photos)
  await removeBlobPhotos(
    (previous.photos ?? []).filter((url) => url && !kept.has(url)),
  )

  return toDTO(rows[0])
}

/**
 * Best-effort removal of a cat's photos from Vercel Blob. Local `/uploads/...`
 * paths are left alone, and failures never block the delete.
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
  await db.delete(cats).where(eq(cats.slug, input.slug))
  const photos =
    row.photos && row.photos.length > 0 ? row.photos : [row.photoUrl]
  await removeBlobPhotos(photos.filter(Boolean))
}

export async function purrCat(slug: string): Promise<number> {
  const db = await getDb()
  const rows = await db
    .update(cats)
    .set({ purrs: sql`${cats.purrs} + 1` })
    .where(eq(cats.slug, slug))
    .returning({ purrs: cats.purrs })
  if (!rows[0]) throw new Error(ERR.CAT_GONE)
  return rows[0].purrs
}
