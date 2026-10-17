import { PGlite } from '@electric-sql/pglite'
import { hashToken } from '../src/lib/tokens'
import { slugify } from '../src/lib/utils'

const demo = [
  { name: 'Biscuit', birthdate: '2024-05-14', photoUrl: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=1200&q=80&auto=format&fit=crop', bio: 'Loves: boxes, sunbeams, ankles. Hates: the vacuum and Mondays.', coat: 'orange', purrs: 42 },
  { name: 'Mochi', birthdate: '2021-09-02', photoUrl: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=1200&q=80&auto=format&fit=crop', bio: 'Professional sleeper. Amateur biter. Full-time icon.', coat: 'white', purrs: 88 },
  { name: 'Professor Whiskers', birthdate: '2015-02-20', photoUrl: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200&q=80&auto=format&fit=crop', bio: 'Has opinions about your typing speed and your life choices.', coat: 'tabby', purrs: 130 },
  { name: 'Noodle', birthdate: '2008-11-30', photoUrl: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=1200&q=80&auto=format&fit=crop', bio: 'Geriatric legend. Naps 22 hours a day with immense dignity.', coat: 'grey', purrs: 201 },
  { name: 'Cleo', birthdate: '2019-07-19', photoUrl: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=1200&q=80&auto=format&fit=crop', bio: 'Runs this household. The humans merely pay the rent.', coat: 'tuxedo', purrs: 64 },
  { name: 'Sir Pounce', birthdate: '2023-01-05', photoUrl: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=1200&q=80&auto=format&fit=crop', bio: 'Currently training for the 3am Olympic sprint finals.', coat: 'calico', purrs: 17 },
]

const ddl = `
CREATE TABLE IF NOT EXISTS cats (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  birthdate date NOT NULL,
  photo_url text NOT NULL,
  photos text[] NOT NULL DEFAULT '{}',
  bio text,
  coat text,
  purrs integer NOT NULL DEFAULT 0,
  edit_token_hash text NOT NULL,
  owner_token_hash text,
  owner_name text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cats_slug_idx ON cats (slug);
CREATE INDEX IF NOT EXISTS cats_created_at_idx ON cats (created_at);
ALTER TABLE cats ADD COLUMN IF NOT EXISTS photos text[] NOT NULL DEFAULT '{}';
ALTER TABLE cats ADD COLUMN IF NOT EXISTS owner_token_hash text;
ALTER TABLE cats ADD COLUMN IF NOT EXISTS owner_name text;
`

async function main() {
  const dir = process.env.PGLITE_DIR || './.pglite'
  const client = new PGlite(dir)
  await client.waitReady
  await client.exec(ddl)

  let added = 0
  for (const cat of demo) {
    const id = crypto.randomUUID()
    const token = crypto.randomUUID().replace(/-/g, '') + id.replace(/-/g, '')
    const tokenHash = await hashToken(token)
    const slug = slugify(cat.name)
    const res = await client.query(
      `INSERT INTO cats (id, name, slug, birthdate, photo_url, photos, bio, coat, purrs, edit_token_hash)
       VALUES ($1, $2, $3, $4, $5, ARRAY[$5], $6, $7, $8, $9)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [id, cat.name, slug, cat.birthdate, cat.photoUrl, cat.bio, cat.coat, cat.purrs, tokenHash],
    )
    added += res.rows.length
  }
  await client.close()
  console.log(`Seeded ${added} of ${demo.length} demo cats.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

