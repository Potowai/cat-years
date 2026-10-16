import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Cat, PawPrint } from 'lucide-react'
import { buttonClass, Chip } from '~/components/ui'
import { catYearLetter } from '~/lib/catAge'
import { getDict, localeFromMatches, useI18n } from '~/lib/i18n'
import { seo } from '~/lib/seo'

const FIRST_YEAR = 2020
const LAST_YEAR = 2032

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
  const thisLetter = catYearLetter(thisYear)
  const years = Array.from(
    { length: LAST_YEAR - FIRST_YEAR + 1 },
    (_, i) => FIRST_YEAR + i,
  )

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
          {l.thisYearIs(thisYear, thisLetter)}
        </p>
        <p className="px-6 py-4 font-display text-[9rem] font-black leading-none text-butter">
          {thisLetter}
        </p>
        <p className="border-t-2 border-paper/15 px-6 py-4 text-sm font-semibold text-cream/85">
          {l.cycle}
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-black">{l.listTitle}</h2>
        <p className="mt-2 font-medium text-ink-soft">{l.listHint}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {years.map((year) => {
            const letter = catYearLetter(year)
            const current = year === thisYear
            return (
              <div
                key={year}
                className={
                  current
                    ? 'rounded-3xl border-2 border-ink bg-butter p-4 text-center shadow-sticker'
                    : 'rounded-3xl border-2 border-ink bg-paper p-4 text-center shadow-sticker-sm'
                }
              >
                <p className="font-display text-3xl font-black leading-none">
                  {letter}
                </p>
                <p className="mt-2 text-sm font-bold text-ink-soft">
                  {year}
                </p>
                {current ? (
                  <p className="mt-2 text-[10px] font-black uppercase tracking-wider">
                    {l.current}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-black">{l.ideasTitle}</h2>
        <ul className="mt-4 grid gap-3">
          {l.ideas.map((idea) => (
            <li
              key={idea}
              className="flex items-start gap-3 rounded-3xl border-2 border-ink bg-paper px-5 py-4 font-medium shadow-sticker-sm"
            >
              <span aria-hidden className="text-xl">
                🧶
              </span>
              <span className="text-ink-soft">{idea}</span>
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
