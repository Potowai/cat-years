/// <reference types="vite/client" />
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

type DbGlobal = typeof globalThis & {
  __catYearsDb?: Promise<Database>
}

/**
 * Schema for the embedded PGlite database used in local development, and by
 * `scripts/seed.ts`. In production the same schema is applied on first connect
 * (and by `npm run db:push`), so keep it in sync with `./schema.ts`.
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
  count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cat_id, ip_hash)
);
ALTER TABLE purrs ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 0;
ALTER TABLE purrs ADD COLUMN IF NOT EXISTS window_started_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS purrs_created_at_idx ON purrs (created_at);
`

/** The slice of the postgres.js client needed to apply the schema. */
type RawSqlClient = { unsafe: (query: string) => Promise<unknown> }

/**
 * Bring a production database up to date with the code.
 *
 * The tables are created once with `npm run db:push`, but a schema added in a
 * later deploy — a new table like `photo_uploads` — would otherwise only show
 * up as an opaque 500 on the first request that needs it. Re-applying the
 * idempotent DDL on first connect keeps the database in step with the code.
 *
 * Best-effort: if the database user cannot run DDL, we log and carry on rather
 * than taking the whole app down over it.
 */
async function ensureSchema(client: RawSqlClient): Promise<void> {
  try {
    // No parameters means postgres.js uses the simple protocol, which allows
    // several statements in one round trip.
    await client.unsafe(DDL)
  } catch (error) {
    console.error(
      '[cat-years] could not apply the database schema — run ' +
        '`npm run db:push` against DATABASE_URL.',
      error,
    )
  }
}

async function createPostgresDb(url: string): Promise<Database> {
  const [{ drizzle }, { default: postgres }] = await Promise.all([
    import('drizzle-orm/postgres-js'),
    import('postgres'),
  ])
  const client = postgres(url, {
    prepare: false,
    max: 1,
    // The schema below is idempotent, so Postgres reports each object it skips
    // on every cold start. Drop that noise; keep every other notice.
    onnotice: (notice) => {
      if (!notice.message?.includes('already exists, skipping')) {
        console.warn('[cat-years]', notice.message)
      }
    },
  })
  await ensureSchema(client)
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
