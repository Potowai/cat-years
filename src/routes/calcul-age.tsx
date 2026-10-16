import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Cat, PawPrint } from 'lucide-react'
import { buttonClass, Chip } from '~/components/ui'
import {
  KIBBLE_GRAMS_PER_DAY,
  STAGE_META,
  STAGE_RANGES,
  humanYearsForMonths,
  stageForMonths,
} from '~/lib/catAge'
import { getDict, localeFromMatches, useI18n } from '~/lib/i18n'
import { seo } from '~/lib/seo'

const LOOKUP_YEARS = [1, 2, 3, 5, 8, 10, 15, 20]

export const Route = createFileRoute('/calcul-age')({
  head: ({ matches }) => {
    const d = getDict(localeFromMatches(matches))
    return {
      meta: seo({
        title: d.how.title,
        description: d.how.intro,
      }),
    }
  },
  component: AgeMath,
})

function AgeMath() {
  const i18n = useI18n()
  const h = i18n.how

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
        <Chip tone="sage" className="animate-pop">
          {h.badge}
        </Chip>
        <h1 className="mt-5 text-4xl font-black leading-[1.05] sm:text-6xl">
          {h.title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg font-medium text-ink-soft">
          {h.intro}
        </p>
      </header>

      <section className="mt-12">
        <h2 className="text-3xl font-black">{h.ruleTitle}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <RuleCard
            step="1"
            value="15"
            title={h.rule1Title}
            body={h.rule1Body}
          />
          <RuleCard
            step="2"
            value="+9"
            title={h.rule2Title}
            body={h.rule2Body}
          />
          <RuleCard
            step="3"
            value="+4"
            title={h.rule3Title}
            body={h.rule3Body}
          />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-black">{h.tableTitle}</h2>
        <p className="mt-2 font-medium text-ink-soft">{h.tableHint}</p>
        <div className="mt-5 overflow-hidden rounded-[26px] border-2 border-ink bg-paper shadow-sticker">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-ink bg-cream">
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">
                  {h.tableCat}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">
                  {h.tableHuman}
                </th>
                <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider">
                  {h.tableStage}
                </th>
              </tr>
            </thead>
            <tbody>
              {LOOKUP_YEARS.map((years) => {
                const stageId = stageForMonths(years * 12)
                return (
                  <tr
                    key={years}
                    className="border-b-2 border-ink/10 last:border-0 even:bg-cream/40"
                  >
                    <td className="px-4 py-3 font-bold">
                      <Cat className="mr-2 inline size-4" aria-hidden />
                      {i18n.units.year(years)}
                    </td>
                    <td className="px-4 py-3 font-display text-xl font-black text-tangerine">
                      {i18n.formatNumber(
                        Math.round(humanYearsForMonths(years * 12)),
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-ink-soft">
                      <span aria-hidden>
                        {STAGE_META[stageId].emoji}{' '}
                      </span>
                      {i18n.stageLabel(stageId)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-black">{h.stagesTitle}</h2>
        <p className="mt-2 font-medium text-ink-soft">{h.stagesHint}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {STAGE_RANGES.map((range) => (
            <div
              key={range.id}
              className="rounded-3xl border-2 border-ink bg-paper p-4 shadow-sticker-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <Chip tone={STAGE_META[range.id].accent}>
                  <span aria-hidden>{STAGE_META[range.id].emoji}</span>
                  {i18n.stageLabel(range.id)}
                </Chip>
                <span className="shrink-0 text-sm font-bold text-ink-soft">
                  {range.toMonths === null
                    ? h.rangeOpen(range.fromMonths)
                    : h.range(range.fromMonths, range.toMonths)}
                </span>
              </div>
              <p className="mt-3 font-medium text-ink-soft">
                {i18n.stageBlurb(range.id)}
              </p>
              <p className="mt-3 text-sm font-bold">
                {h.kibblePerDay(KIBBLE_GRAMS_PER_DAY[range.id])}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-3xl font-black">{h.statsTitle}</h2>
        <p className="mt-2 font-medium text-ink-soft">{h.statsHint}</p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <HowRow label={i18n.facts.days} body={h.daysHow} />
          <HowRow label={i18n.facts.naps} body={h.napsHow} />
          <HowRow label={i18n.facts.heartbeats} body={h.beatsHow} />
          <HowRow label={i18n.facts.kibble} body={h.kibbleHow} />
        </dl>
      </section>

      <section className="mt-14 rounded-[28px] border-2 border-ink bg-cream/60 px-6 py-6">
        <h2 className="text-2xl font-black">{h.caveatTitle}</h2>
        <p className="mt-2 font-medium text-ink-soft">{h.caveatBody}</p>
      </section>

      <div className="mt-10">
        <Link to="/new" className={buttonClass({ size: 'lg' })}>
          <PawPrint className="size-5" aria-hidden />
          {h.cta}
        </Link>
      </div>
    </div>
  )
}

function RuleCard({
  step,
  value,
  title,
  body,
}: {
  step: string
  value: string
  title: string
  body: string
}) {
  return (
    <div className="rounded-[26px] border-2 border-ink bg-paper p-5 shadow-sticker-sm">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-5xl font-black leading-none text-tangerine">
          {value}
        </span>
        <span className="text-xs font-black uppercase tracking-wider text-ink-soft">
          {step}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-black">{title}</h3>
      <p className="mt-1.5 text-sm font-medium text-ink-soft">{body}</p>
    </div>
  )
}

function HowRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-3xl border-2 border-ink bg-paper px-5 py-4 shadow-sticker-sm">
      <dt className="font-black">{label}</dt>
      <dd className="mt-1 font-medium text-ink-soft">{body}</dd>
    </div>
  )
}
