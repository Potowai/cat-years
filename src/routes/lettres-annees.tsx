import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Cat, PawPrint } from 'lucide-react'
import { buttonClass, Chip } from '~/components/ui'
import { catYearLetters } from '~/lib/catAge'
import { getDict, localeFromMatches, useI18n } from '~/lib/i18n'
import { seo } from '~/lib/seo'

/** The years shown, matching the official LOOF table. */
const FIRST_YEAR = 2015
const LAST_YEAR = 2034
const PER_ROW = 5
const LOOF_URL = 'https://loof.asso.fr/une-annee-une-lettre'

export const Route = createFileRoute('/lettres-annees')({
  head: ({ matches }) => {
    const d = getDict(localeFromMatches(matches))
    return {
      meta: seo({
        title: d.letters.title,
        description: d.letters.intro,
      }),
    }
  },
  component: YearLetters,
})

function YearLetters() {
  const i18n = useI18n()
  const l = i18n.letters
  const thisYear = new Date().getUTCFullYear()
  const thisLetters = catYearLetters(thisYear)
  const thisLabel = joinLetters(thisLetters, l.or)

  const years = Array.from(
    { length: LAST_YEAR - FIRST_YEAR + 1 },
    (_, i) => FIRST_YEAR + i,
  )
  const rows: number[][] = []
  for (let i = 0; i < years.length; i += PER_ROW) {
    rows.push(years.slice(i, i + PER_ROW))
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {i18n.detail.back}
      </Link>

      <header className="mt-6">
        <Chip tone="sky" className="animate-pop">
          {l.badge}
        </Chip>
        <h1 className="mt-5 text-4xl font-black leading-[1.05] sm:text-6xl">
          {l.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg font-medium text-ink-soft">
          {l.intro}
        </p>
      </header>

      <section className="mt-12 overflow-hidden rounded-[28px] border-2 border-ink bg-ink text-paper shadow-sticker">
        <p className="px-6 pt-7 text-lg font-semibold text-cream/80">
          {l.thisYearIs(thisYear, thisLabel)}
        </p>
        <p className="px-6 py-4 font-display text-[9rem] font-black leading-none text-butter">
          {thisLabel}
        </p>
        <p className="border-t-2 border-paper/15 px-6 py-4 text-sm font-semibold text-cream/85">
          {l.cycle}
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-black">{l.listTitle}</h2>
        <p className="mt-2 font-medium text-ink-soft">{l.listHint}</p>

        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <div
              key={row[0]}
              className="overflow-hidden rounded-2xl border-2 border-ink shadow-sticker-sm"
            >
              <table className="w-full table-fixed border-collapse text-center">
                <thead>
                  <tr className="bg-sky text-paper">
                    {row.map((year) => (
                      <th
                        key={year}
                        scope="col"
                        className="border-r-2 border-paper/20 px-2 py-2.5 text-sm font-black tracking-wide last:border-r-0"
                      >
                        {year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {row.map((year) => {
                      const letters = catYearLetters(year)
                      const current = year === thisYear
                      return (
                        <td
                          key={year}
                          className={
                            current
                              ? 'border-r-2 border-ink/10 bg-butter px-2 py-4 last:border-r-0'
                              : 'border-r-2 border-ink/10 bg-paper px-2 py-4 last:border-r-0'
                          }
                        >
                          <span className="font-display text-2xl font-black">
                            {joinLetters(letters, l.or)}
                          </span>
                          {current ? (
                            <span className="mt-1 block text-[10px] font-black uppercase tracking-wider">
                              {l.current}
                            </span>
                          ) : null}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm font-medium text-ink-soft">
          {l.source}{' '}
          <a
            href={LOOF_URL}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline decoration-ink/30 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
          >
            {l.sourceLabel}
          </a>
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-black">{l.usageTitle}</h2>
        <ul className="mt-4 grid gap-3">
          {l.usage.map((point) => (
            <li
              key={point}
              className="rounded-3xl border-2 border-ink bg-paper px-5 py-4 font-medium text-ink-soft shadow-sticker-sm"
            >
              {point}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link to="/calcul-age" className={buttonClass({ variant: 'outline' })}>
          <Cat className="size-5" aria-hidden />
          {l.ctaCalc}
        </Link>
        <Link to="/" className={buttonClass({ variant: 'ghost' })}>
          <PawPrint className="size-5" aria-hidden />
          {l.ctaWall}
        </Link>
      </div>
    </div>
  )
}

function joinLetters(letters: string[], or: string): string {
  if (letters.length <= 1) return letters[0] ?? ''
  if (letters.length === 2) return `${letters[0]} ${or} ${letters[1]}`
  return `${letters.slice(0, -1).join(', ')} ${or} ${letters[letters.length - 1]}`
}
