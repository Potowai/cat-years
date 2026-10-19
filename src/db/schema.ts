import { sql } from 'drizzle-orm'
import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const cats = pgTable(
  'cats',
  {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    /** Unique, derived from the name — duplicates get a -2, -3 … suffix. */
    slug: text('slug').notNull().unique(),
    birthdate: date('birthdate').notNull(),
    /** Cover photo (first of `photos`), kept for backwards compatibility. */
    photoUrl: text('photo_url').notNull(),
    /** All photos of the cat, in display order. */
    photos: text('photos').array().notNull().default(sql`'{}'::text[]`),
    bio: text('bio'),
    coat: text('coat'),
    purrs: integer('purrs').notNull().default(0),
    /** Per-cat secret, kept for the original single-cat editing flow. */
    editTokenHash: text('edit_token_hash').notNull(),
    /** One secret per owner: unlocks every cat they added, on any device. */
    ownerTokenHash: text('owner_token_hash'),
    /** Optional public display name of the owner ("par Marie"). */
    ownerName: text('owner_name'),
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('cats_created_at_idx').on(table.createdAt),
    index('cats_owner_token_idx').on(table.ownerTokenHash),
    /** Rate-limit lookups filter on (ip_hash, created_at). */
    index('cats_ip_hash_idx').on(table.ipHash, table.createdAt),
  ],
)

/**
 * Every photo URL this app has ever handed out, and who it belongs to.
 *
 * This is the ownership record that makes deleting a photo safe: storage
 * cleanup only ever touches a URL whose row is claimed by the cat being
 * deleted, so a client can never point the app at someone else's blob.
 */
export const photoUploads = pgTable(
  'photo_uploads',
  {
    url: text('url').primaryKey(),
    ipHash: text('ip_hash'),
    /** Null until the upload is attached to a cat by create/update. */
    catId: uuid('cat_id').references(() => cats.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('photo_uploads_cat_idx').on(table.catId),
    index('photo_uploads_ip_idx').on(table.ipHash, table.createdAt),
  ],
)

/**
 * One row per (cat, visitor): a visitor can purr a given cat once. Makes the
 * purr count meaningful instead of trivially inflatable, and doubles as the
 * rate-limit record.
 */
export const purrs = pgTable(
  'purrs',
  {
    catId: uuid('cat_id')
      .notNull()
      .references(() => cats.id, { onDelete: 'cascade' }),
    ipHash: text('ip_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.catId, table.ipHash] }),
    index('purrs_created_at_idx').on(table.createdAt),
  ],
)

export type CatRow = typeof cats.$inferSelect
export type NewCatRow = typeof cats.$inferInsert
export type PhotoUploadRow = typeof photoUploads.$inferSelect
