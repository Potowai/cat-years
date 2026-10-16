/// <reference types="vite/client" />
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

type DbGlobal = typeof globalThis & {
  __catYearsDb?: Promise<Database>
}

const ddl = `
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
  await client.exec(ddl)
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
