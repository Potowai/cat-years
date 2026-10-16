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
    slug: text('slug').notNull().unique(),
    birthdate: date('birthdate').notNull(),
    photoUrl: text('photo_url').notNull(),
    bio: text('bio'),
    coat: text('coat'),
    purrs: integer('purrs').notNull().default(0),
    editTokenHash: text('edit_token_hash').notNull(),
    ipHash: text('ip_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('cats_created_at_idx').on(table.createdAt)],
)

export type CatRow = typeof cats.$inferSelect
export type NewCatRow = typeof cats.$inferInsert
