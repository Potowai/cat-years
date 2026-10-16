import { createFileRoute } from '@tanstack/react-router'
import { CatForm } from '~/components/CatForm'
import { getDict, localeFromMatches, useI18n } from '~/lib/i18n'
import { seo } from '~/lib/seo'

export const Route = createFileRoute('/new')({
  head: ({ matches }) => {
    const d = getDict(localeFromMatches(matches))
    return {
      meta: [
        ...seo({ title: d.seo.addTitle, description: d.seo.addDesc }),
        { name: 'robots', content: 'noindex' },
      ],
    }
  },
  component: NewCat,
})

function NewCat() {
  const i18n = useI18n()
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <div className="max-w-2xl">
        <h1 className="text-5xl font-black sm:text-6xl">
          {i18n.form.newTitle}
        </h1>
        <p className="mt-4 text-lg font-medium text-ink-soft">
          {i18n.form.newSubtitle}
        </p>
      </div>
      <div className="mt-10">
        <CatForm mode="create" />
      </div>
    </div>
  )
}
