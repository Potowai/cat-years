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
  if (hash !== row.editTokenHash) {
    throw new Error(ERR.NOT_OWNER)
  }
  return row
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
  await assertOwner(input.slug, input.token)
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
  return toDTO(rows[0])
}

export async function deleteCat(input: {
  slug: string
  token: string
}): Promise<void> {
  const db = await getDb()
  await assertOwner(input.slug, input.token)
  await db.delete(cats).where(eq(cats.slug, input.slug))
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
