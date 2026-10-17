import { useEffect, useState } from 'react'
import {
  createFileRoute,
  Link,
  notFound,
  useNavigate,
} from '@tanstack/react-router'
import { CatForm } from '~/components/CatForm'
import { getOwnership, rememberOwnership } from '~/lib/tokens'
import { getDict, localeFromMatches, useI18n } from '~/lib/i18n'
import { seo } from '~/lib/seo'
import { buttonClass } from '~/components/ui'
import { getCatFn } from '~/server/cats.functions'

export const Route = createFileRoute('/cats/$catSlug_/edit')({
  // A private editing link carries the owner token in `?token=…`, which is how
  // the owner is recognised on a device that never created the cat.
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token:
      typeof search.token === 'string' && search.token.length >= 10
        ? search.token
        : undefined,
  }),
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
        { name: 'referrer', content: 'no-referrer' },
      ],
    }
  },
  component: EditCat,
})

function EditCat() {
  const i18n = useI18n()
  const cat = Route.useLoaderData()
  const { token: urlToken } = Route.useSearch()
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!urlToken) {
      setToken(getOwnership(cat.id))
      return
    }
    // Adopt the token from the private link, remember it here, then drop it
    // from the address bar so it does not linger in history or screenshots.
    rememberOwnership(cat.id, urlToken)
    setToken(urlToken)
    void navigate({
      to: '/cats/$catSlug/edit',
      params: { catSlug: cat.slug },
      search: {},
      replace: true,
    })
  }, [cat.id, cat.slug, urlToken, navigate])

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
        <p className="mt-3 rounded-2xl border-2 border-dashed border-ink/40 bg-cream/40 px-4 py-3 text-sm font-medium text-ink-soft">
          {i18n.form.notOwnerHint}
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
