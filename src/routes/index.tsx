import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Cat, PawPrint } from 'lucide-react'
import { CatCard } from '~/components/CatCard'
import { buttonClass, Chip } from '~/components/ui'
import { useI18n } from '~/lib/i18n'
import type { CatSort } from '~/lib/types'
import { cn } from '~/lib/utils'
import { getWallStatsFn, listCatsFn } from '~/server/cats.functions'

const SORTS = ['newest', 'oldest', 'senior', 'popular', 'name'] as const

function parseSort(value: unknown): CatSort {
  return (SORTS as readonly string[]).includes(value as string)
    ? (value as CatSort)
    : 'newest'
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { sort?: CatSort } => ({
    sort: parseSort(search.sort),
  }),
  loaderDeps: ({ search }) => ({ sort: search.sort ?? 'newest' }),
  loader: async ({ deps }) => {
    // Totals come from every cat; only the wall itself is capped at one page.
    const [cats, stats] = await Promise.all([
      listCatsFn({ data: { sort: deps.sort } }),
      getWallStatsFn(),
    ])
    return { cats, stats }
  },
  component: Home,
})

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-paper px-4 py-3 text-center shadow-sticker-sm">
      <div className="font-display text-3xl font-black leading-none">
        {value}
      </div>
      <div className="mt-1 text-xs font-bold uppercase tracking-wider text-ink-soft">
        {label}
      </div>
    </div>
  )
}

function Home() {
  const i18n = useI18n()
  const { cats, stats } = Route.useLoaderData()
  const sort = Route.useSearch().sort ?? 'newest'

  const hasCats = stats.cats > 0

  return (
    <div className="mx-auto max-w-6xl px-5">
      <section className="relative pt-14 sm:pt-20">
        <div className="max-w-3xl">
          <Chip tone="sage" className="animate-pop">
            {i18n.home.badge}
          </Chip>
          <h1 className="mt-5 text-4xl font-black leading-[0.95] sm:text-6xl lg:text-7xl">
            {i18n.home.titleBefore}
            <span className="relative inline-block">
              <span className="relative z-10 text-tangerine">
                {i18n.home.titleHighlight}
              </span>
              <span className="absolute inset-x-0 bottom-1 z-0 h-3 -rotate-1 rounded-full bg-butter" />
            </span>
            {i18n.home.titleAfter}
          </h1>
          <p className="mt-5 max-w-xl text-lg font-medium text-ink-soft">
            {i18n.home.subtitle}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/new"
              className={buttonClass({
                size: 'lg',
                className: 'px-5 text-base sm:px-7 sm:text-lg',
              })}
            >
              {i18n.home.ctaAdd}
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </Link>
            {hasCats ? (
              <a
                href="#wall"
                className={buttonClass({
                  variant: 'outline',
                  size: 'lg',
                  className: 'px-5 text-base sm:px-7 sm:text-lg',
                })}
              >
                {i18n.home.ctaSee(stats.cats)}
              </a>
            ) : null}
          </div>
        </div>

        {hasCats ? (
          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              value={i18n.formatNumber(stats.cats)}
              label={i18n.home.statCats}
            />
            <Stat
              value={i18n.formatNumber(stats.purrs)}
              label={i18n.home.statPurrs}
            />
            <Stat
              value={`${Math.round(stats.avgHumanYears)}`}
              label={i18n.home.statAvg}
            />
            <Stat
              value={hasCats ? `${Math.round(stats.oldestHumanYears)}` : '—'}
              label={i18n.home.statOldest}
            />
          </div>
        ) : null}
      </section>

      <div
        aria-hidden="true"
        className="mt-14 overflow-hidden border-y-2 border-ink/10 bg-ink py-3 text-paper"
      >
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap motion-reduce:animate-none">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex gap-8">
              {i18n.home.marquee.map((line) => (
                <span
                  key={line}
                  className="font-display text-lg font-bold tracking-tight"
                >
                  {line}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section id="wall" className="scroll-mt-24 pt-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black sm:text-4xl">
              {i18n.home.wallTitle}{' '}
              <span className="text-ink-soft/60">/ {i18n.home.sorts[sort]}</span>
            </h2>
            <p className="mt-1 font-medium text-ink-soft">
              {i18n.home.wallHint}
            </p>
          </div>
          <div className="-mx-1 flex w-full gap-2 overflow-x-auto px-1 pb-1 hide-scrollbar sm:w-auto sm:flex-wrap sm:overflow-visible sm:pb-0">
            {SORTS.map((s) => (
              <Link
                key={s}
                to="/"
                search={{ sort: s }}
                className={cn(
                  'shrink-0 rounded-full border-2 border-ink px-3 py-1.5 text-sm font-bold transition-colors sm:px-3.5',
                  sort === s
                    ? 'bg-ink text-paper'
                    : 'bg-paper text-ink hover:bg-cream',
                )}
              >
                {i18n.home.sorts[s]}
              </Link>
            ))}
          </div>
        </div>

        {cats.length === 0 ? (
          <EmptyWall />
        ) : (
          <div className="mt-8 columns-1 gap-4 min-[480px]:columns-2 sm:gap-5 md:columns-3 lg:columns-4">
            {cats.map((cat, i) => (
              <CatCard key={cat.id} cat={cat} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyWall() {
  const i18n = useI18n()
  return (
    <div className="mt-8 grid place-items-center rounded-[28px] border-2 border-dashed border-ink/40 bg-cream/40 px-6 py-20 text-center">
      <div className="grid size-20 place-items-center rounded-3xl border-2 border-ink bg-butter text-4xl shadow-sticker-sm animate-float motion-reduce:animate-none">
        <Cat className="size-10" aria-hidden />
      </div>
      <h3 className="mt-6 text-3xl font-black">{i18n.home.emptyTitle}</h3>
      <p className="mt-2 max-w-md font-medium text-ink-soft">
        {i18n.home.emptyText}
      </p>
      <Link to="/new" className={buttonClass({ className: 'mt-6' })}>
        <PawPrint className="size-5" aria-hidden />
        {i18n.home.emptyCta}
      </Link>
    </div>
  )
}
