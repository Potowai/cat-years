import { getDb } from '../src/db/client.server'
import { cats } from '../src/db/schema'
import { hashToken } from '../src/lib/tokens'
import { slugify } from '../src/lib/utils'

const demo = [
  {
    name: 'Biscuit',
    birthdate: '2024-05-14',
    photoUrl:
      'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=1200&q=80&auto=format&fit=crop',
    bio: 'Loves: boxes, sunbeams, ankles. Hates: the vacuum and Mondays.',
    coat: 'orange',
    purrs: 42,
  },
  {
    name: 'Mochi',
    birthdate: '2021-09-02',
    photoUrl:
      'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=1200&q=80&auto=format&fit=crop',
    bio: 'Professional sleeper. Amateur biter. Full-time icon.',
    coat: 'white',
    purrs: 88,
  },
  {
    name: 'Professor Whiskers',
    birthdate: '2015-02-20',
    photoUrl:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=1200&q=80&auto=format&fit=crop',
    bio: 'Has opinions about your typing speed and your life choices.',
    coat: 'tabby',
    purrs: 130,
  },
  {
    name: 'Noodle',
    birthdate: '2008-11-30',
    photoUrl:
      'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=1200&q=80&auto=format&fit=crop',
    bio: 'Geriatric legend. Naps 22 hours a day with immense dignity.',
    coat: 'grey',
    purrs: 201,
  },
  {
    name: 'Cleo',
    birthdate: '2019-07-19',
    photoUrl:
      'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=1200&q=80&auto=format&fit=crop',
    bio: 'Runs this household. The humans merely pay the rent.',
    coat: 'tuxedo',
    purrs: 64,
  },
  {
    name: 'Sir Pounce',
    birthdate: '2023-01-05',
    photoUrl:
      'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=1200&q=80&auto=format&fit=crop',
    bio: 'Currently training for the 3am Olympic sprint finals.',
    coat: 'calico',
    purrs: 17,
  },
]

async function main() {
  if (!process.env.DATABASE_URL) process.env.CAT_YEARS_ALLOW_PGLITE = '1'
  const db = await getDb()
  let added = 0
  for (const cat of demo) {
    const id = crypto.randomUUID()
    const token = crypto.randomUUID().replace(/-/g, '')
    const rows = await db
      .insert(cats)
      .values({
        id,
        name: cat.name,
        slug: slugify(cat.name),
        birthdate: cat.birthdate,
        photoUrl: cat.photoUrl,
        bio: cat.bio,
        coat: cat.coat,
        purrs: cat.purrs,
        editTokenHash: await hashToken(token),
      })
      .onConflictDoNothing()
      .returning({ id: cats.id })
    added += rows.length
  }
  console.log(`Seeded ${added} of ${demo.length} demo cats.`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
