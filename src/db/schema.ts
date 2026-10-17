import { sql } from 'drizzle-orm'
import {
  date,
  index,
  integer,
  pgTable,
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
  ],
)

export type CatRow = typeof cats.$inferSelect
export type NewCatRow = typeof cats.$inferInsert
