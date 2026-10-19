/// <reference types="vite/client" />
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

type DbGlobal = typeof globalThis & {
  __catYearsDb?: Promise<Database>
}

/**
 * Schema for the embedded PGlite database used in local development, and by
 * `scripts/seed.ts`. In production the same schema is applied with
 * `npm run db:push` from `./schema.ts`, so keep the two in sync.
 */
export const DDL = `
CREATE TABLE IF NOT EXISTS cats (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  birthdate date NOT NULL,
  photo_url text NOT NULL,
  bio text,
  coat text,
  purrs integer NOT NULL DEFAULT 0,
  edit_token_hash text NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cats_slug_idx ON cats (slug);
CREATE INDEX IF NOT EXISTS cats_created_at_idx ON cats (created_at);
ALTER TABLE cats ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';
ALTER TABLE cats ADD COLUMN IF NOT EXISTS owner_token_hash text;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS owner_name text;
CREATE INDEX IF NOT EXISTS cats_owner_token_idx ON cats (owner_token_hash);
CREATE INDEX IF NOT EXISTS cats_ip_hash_idx ON cats (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS photo_uploads (
  url text PRIMARY KEY,
  ip_hash text,
  cat_id uuid REFERENCES cats (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photo_uploads_cat_idx ON photo_uploads (cat_id);
CREATE INDEX IF NOT EXISTS photo_uploads_ip_idx ON photo_uploads (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS purrs (
  cat_id uuid NOT NULL REFERENCES cats (id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cat_id, ip_hash)
);
CREATE INDEX IF NOT EXISTS purrs_created_at_idx ON purrs (created_at);
`

async function createPostgresDb(url: string): Promise<Database> {
  const [{ drizzle }, { default: postgres }] = await Promise.all([
    import('drizzle-orm/postgres-js'),
    import('postgres'),
  ])
  const client = postgres(url, { prepare: false, max: 1 })
  return drizzle(client, { schema })
}

async function createPgliteDb(): Promise<Database> {
  const [{ PGlite }, { drizzle }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
  ])
  const client = new PGlite(process.env.PGLITE_DIR || './.pglite')
  await client.waitReady
  await client.exec(DDL)
  return drizzle(client, { schema }) as unknown as Database
}

export function getDb(): Promise<Database> {
  const g = globalThis as DbGlobal
  if (g.__catYearsDb) return g.__catYearsDb

  const url = process.env.DATABASE_URL
  if (url) {
    g.__catYearsDb = createPostgresDb(url)
    return g.__catYearsDb
  }

  // PGlite is an embedded database used only for local development. `import.meta.env`
  // is only defined under Vite, so guard the access for plain Node (e.g. `npm run seed`).
  const isDev =
    (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true
  if (isDev || process.env.CAT_YEARS_ALLOW_PGLITE === '1') {
    g.__catYearsDb = createPgliteDb()
    return g.__catYearsDb
  }

  return Promise.reject(
    new Error(
      'DATABASE_URL is not set. Attach a Postgres database (Neon) to this project.',
    ),
  )
}
