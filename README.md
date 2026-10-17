# 🐾 Cat Years

Put your cat on the wall of the internet. Share a photo and a birthday and the
app works out — with extremely scientific rigour — how old your cat really is in
human years. Everyone can browse the wall and give each cat a purr.

Built with **TanStack Start** (TanStack Router + React Query) and deployed to
**Vercel** via **Nitro**.

## Features

- **The wall** — a masonry feed of every cat, sortable by newest, oldest cats,
  most senior, most purred or A→Z.
- **Add a cat** — drag-and-drop photo, birthday, coat colour, optional bio, with
  a live age preview while you type.
- **Cat report card** — human age reveal, cat age, life stage, "extremely
  scientific" stats (naps, heartbeats, days on Earth), a verdict, a purr button
  and one-tap sharing.
- **No accounts** — you get a secret key stored in your browser, so you can
  edit or delete your own cats without signing up. On another device, open your
  **private editing link** (`/cats/<slug>/edit?token=…`, copy it from the owner
  bar) and you are recognised automatically: the link is the key, so treat it
  like a password.
- **Personalised social previews** per cat for sharing.
- **English & French, automatically** — the app picks a language from the
  visitor's region (Vercel geo headers), then their browser's `Accept-Language`,
  and remembers any manual choice in a cookie. A toggle in the header switches
  instantly.

## Stack

| Concern      | Choice                                             |
| ------------ | -------------------------------------------------- |
| Framework    | TanStack Start (Router + Query + server functions) |
| Styling      | Tailwind CSS v4, Fraunces + Plus Jakarta Sans      |
| i18n         | Built-in EN/FR dictionaries + region detection     |
| Database     | Postgres (Neon on Vercel) via Drizzle ORM          |
| Local DB     | PGlite (embedded, zero setup)                      |
| Photos       | Vercel Blob (local: `public/uploads`)              |
| Deployment   | Vercel (Nitro Vite plugin)                         |

## Run locally

```bash
npm install
npm run dev
```

That's it — **no database or storage account required for local dev**:

- No `DATABASE_URL` → an embedded **PGlite** database is created in `./.pglite`.
- No `BLOB_READ_WRITE_TOKEN` → uploads are written to `./public/uploads`.

> PGlite and disk uploads are **development-only conveniences**. In production
> the app uses your Postgres `DATABASE_URL` and Vercel Blob — set both on Vercel
> (both have free tiers).

Optionally seed some demo cats:

```bash
npm run seed
```

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. Import the repo at [vercel.com/new](https://vercel.com/new). Vercel detects
   the framework via Nitro automatically.
3. In the project's **Storage** tab, add:
   - **Postgres** (Neon) → sets `DATABASE_URL` for you.
   - **Blob** → sets `BLOB_READ_WRITE_TOKEN` for you.
4. Create the database tables once (from your machine, against the prod
   database):

   ```bash
   # after copying the prod DATABASE_URL into .env, or:
   vercel env pull .env.local
   npm run db:push
   ```

5. Deploy. Done.

> `npm run build` runs `vite build` (which emits the Nitro `.output` used by
> Vercel) and then a TypeScript check.

## Environment variables

See `.env.example`. All are optional locally.

| Variable                 | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `DATABASE_URL`           | Postgres connection string (prod)          |
| `BLOB_READ_WRITE_TOKEN`  | Vercel Blob token for photo uploads (prod)  |
| `IP_SALT`                | Salt for hashed IPs used in rate limiting   |
| `PGLITE_DIR`             | Where the local PGlite data lives (`.pglite`) |

## Scripts

| Script              | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Start the dev server on :3000         |
| `npm run build`     | Production build + typecheck          |
| `npm run preview`   | Preview the production build          |
| `npm run typecheck` | TypeScript only                       |
| `npm run db:push`   | Push the Drizzle schema to Postgres   |
| `npm run seed`      | Insert demo cats                      |
