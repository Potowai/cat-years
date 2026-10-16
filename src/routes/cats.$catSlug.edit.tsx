import { useEffect, useState } from 'react'
import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { CatForm } from '~/components/CatForm'
import { getOwnership } from '~/lib/tokens'
import { getDict, localeFromMatches, useI18n } from '~/lib/i18n'
import { seo } from '~/lib/seo'
import { buttonClass } from '~/components/ui'
import { getCatFn } from '~/server/cats.functions'

export const Route = createFileRoute('/cats/$catSlug/edit')({
  loader: async ({ params }) => {
    const cat = await getCatFn({ data: { slug: params.catSlug } })
    if (!cat) throw notFound()
    return cat
  },
  head: ({ matches }) => {
    const d = getDict(localeFromMatches(matches))
    return {
      meta: [
        ...seo({ title: d.seo.editTitle, description: d.seo.editDesc }),
        { name: 'robots', content: 'noindex' },
      ],
    }
  },
  component: EditCat,
})

function EditCat() {
  const i18n = useI18n()
  const cat = Route.useLoaderData()
  const [token, setToken] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    setToken(getOwnership(cat.id))
  }, [cat.id])

  if (token === undefined) {
    return (
      <div className="mx-auto max-w-6xl px-5 py-20 text-center text-ink-soft">
        {i18n.form.loading}
      </div>
    )
  }

  if (token === null) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <div className="text-6xl">🔒</div>
        <h1 className="mt-6 text-4xl font-black">{i18n.form.notOwnerTitle}</h1>
        <p className="mt-3 font-medium text-ink-soft">
          {i18n.form.notOwnerText(cat.name)}
        </p>
        <Link
          to="/cats/$catSlug"
          params={{ catSlug: cat.slug }}
          className={buttonClass({ className: 'mt-6' })}
        >
          {i18n.form.viewCat(cat.name)}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-black sm:text-6xl">
          {i18n.form.editTitle(cat.name)}
        </h1>
        <p className="mt-4 text-lg font-medium text-ink-soft">
          {i18n.form.editSubtitle}
        </p>
      </div>
      <div className="mt-10">
        <CatForm mode="edit" initial={cat} token={token} />
      </div>
    </div>
  )
}
