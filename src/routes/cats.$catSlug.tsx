import { useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ArrowLeft, Share2 } from 'lucide-react'
import { OwnerActions } from '~/components/OwnerActions'
import { PurrButton } from '~/components/PurrButton'
import { CatCarousel } from '~/components/CatCarousel'
import { buttonClass, Chip } from '~/components/ui'
import { computeCatAge } from '~/lib/catAge'
import { getDict, localeFromMatches, useI18n } from '~/lib/i18n'
import { seo } from '~/lib/seo'
import type { CoatId } from '~/lib/types'
import { formatDate } from '~/lib/utils'
import { getCatFn } from '~/server/cats.functions'

export const Route = createFileRoute('/cats/$catSlug')({
  loader: async ({ params }) => {
    const cat = await getCatFn({ data: { slug: params.catSlug } })
    if (!cat) throw notFound()
    return cat
  },
  head: ({ loaderData, matches }) => {
    if (!loaderData) return {}
    const locale = localeFromMatches(matches)
    const d = getDict(locale)
    const age = computeCatAge(loaderData.birthdate)
    const humanLabel =
      age.humanYears < 1
        ? d.units.notEvenOne
        : Math.round(age.humanYears).toString()
    const image = /^https:\/\//.test(loaderData.photoUrl)
      ? loaderData.photoUrl
      : undefined
    return {
      meta: seo({
        title: d.seo.catTitle(loaderData.name, humanLabel),
        description: d.seo.catDesc(
          loaderData.name,
          d.stages[age.stageId].label.toLowerCase(),
          formatDate(loaderData.birthdate, locale),
          humanLabel,
        ),
        image,
      }),
    }
  },
  component: CatDetail,
})

function CatDetail() {
  const i18n = useI18n()
  const cat = Route.useLoaderData()
  const age = computeCatAge(cat.birthdate)
  const facts = i18n.factStats(age)
  const coatLabel =
    cat.coat && cat.coat in i18n.form.coats
      ? i18n.form.coats[cat.coat as CoatId]
      : cat.coat
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: `${cat.name} · Cat Years`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {i18n.detail.back}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="relative mx-auto w-full max-w-md lg:sticky lg:top-24">
          <div className="tape rotate-[-1.5deg] rounded-[26px] border-2 border-ink bg-paper p-3 pb-24 shadow-sticker-lg sm:pb-20">
            <CatCarousel photos={cat.photos} name={cat.name} />
            <div className="absolute inset-x-0 bottom-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 sm:bottom-5 sm:flex-nowrap sm:px-6">
              <span className="min-w-0 max-w-full truncate font-display text-2xl font-black sm:text-3xl">
                {cat.name}
              </span>
              <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-ink-soft sm:text-xs">
                {coatLabel ? `${coatLabel} · ` : ''}
                {i18n.formatDate(cat.birthdate)}
              </span>
            </div>
          </div>
        </div>

        <div className="animate-rise motion-reduce:animate-none">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={i18n.stageAccent(age.stageId)}>
              <span aria-hidden>{i18n.stageEmoji(age.stageId)}</span>
              {i18n.stageLabel(age.stageId)}
            </Chip>
            <Chip tone="cream">{i18n.jobTitle(age)}</Chip>
          </div>

          <h1 className="mt-5 text-4xl font-black sm:text-6xl">
            {i18n.detail.reportCard(cat.name)}
          </h1>
          {cat.ownerName ? (
            <p className="mt-2 text-sm font-bold text-ink-soft">
              {i18n.detail.byOwner(cat.ownerName)}
            </p>
          ) : null}
          <p className="mt-4 text-lg font-medium text-ink-soft">
            {i18n.stageBlurb(age.stageId)}
          </p>

          <div className="mt-6 overflow-hidden rounded-[28px] border-2 border-ink bg-ink text-paper shadow-sticker">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1 px-5 pt-6 sm:px-6">
              <span className="font-display text-6xl font-black leading-none text-butter sm:text-8xl">
                {i18n.humanAgeLabel(age)}
              </span>
              <span className="pb-2 text-lg font-bold text-cream/90 sm:text-xl">
                {i18n.detail.humanYearsOld}
              </span>
            </div>
            <p className="px-5 py-5 text-base font-semibold text-cream/85 sm:px-6 sm:text-lg">
              {i18n.verdict(cat.name, age.humanYears)}
            </p>
            <div className="flex flex-wrap gap-x-8 gap-y-2 border-t-2 border-paper/15 px-5 py-4 text-sm sm:px-6">
              <span className="font-semibold text-cream/80">
                {i18n.detail.catAge}:{' '}
                <span className="font-black text-paper">
                  {i18n.catAgeLabel(age)}
                </span>
              </span>
              <span className="font-semibold text-cream/80">
                {i18n.detail.born}:{' '}
                <span className="font-black text-paper">
                  {i18n.formatDate(cat.birthdate)}
                </span>
              </span>
            </div>
          </div>

          {cat.bio ? (
            <blockquote className="mt-6 rounded-3xl border-2 border-ink bg-cream/60 px-5 py-4 text-lg font-medium italic">
              &ldquo;{cat.bio}&rdquo;
              <footer className="mt-2 text-sm font-bold not-italic text-ink-soft">
                {i18n.detail.alleged(cat.name)}
              </footer>
            </blockquote>
          ) : null}

          <h2 className="mt-8 text-2xl font-black">
            {i18n.detail.scientific}
          </h2>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map((fact) => (
              <div
                key={fact.key}
                className="min-w-0 rounded-2xl border-2 border-ink bg-paper px-3 py-3 text-center shadow-sticker-sm"
              >
                <dd className="flex flex-wrap items-baseline justify-center gap-x-1 font-display text-2xl font-black leading-none">
                  <span className="tabular-nums">{fact.value}</span>
                  {fact.unit ? (
                    <span className="text-sm font-black text-ink-soft">
                      {fact.unit}
                    </span>
                  ) : null}
                </dd>
                <dt className="mt-1.5 break-words text-[11px] font-bold uppercase leading-tight tracking-wide text-ink-soft sm:text-[10px]">
                  {fact.label}
                </dt>
              </div>
            ))}
          </dl>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PurrButton slug={cat.slug} initial={cat.purrs} />
            <button
              type="button"
              onClick={share}
              className={buttonClass({ variant: 'outline' })}
            >
              <Share2 className="size-5" aria-hidden />
              {copied ? i18n.detail.copied : i18n.detail.share}
            </button>
          </div>

          <div className="mt-6">
            <OwnerActions catId={cat.id} slug={cat.slug} />
          </div>
        </div>
      </div>
    </div>
  )
}
