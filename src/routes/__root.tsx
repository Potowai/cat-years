/// <reference types="vite/client" />
import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from '@tanstack/react-router'
import * as React from 'react'
import { DefaultCatchBoundary, NotFound } from '~/components/Boundaries'
import { I18nProvider, localeFromMatches, useI18n } from '~/lib/i18n'
import { LOCALES, type Locale } from '~/lib/locale'
import { seo } from '~/lib/seo'
import { cn } from '~/lib/utils'
import { getLocaleFn } from '~/server/locale.functions'
import appCss from '~/styles/app.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: async () => ({ locale: await getLocaleFn() }),
  head: ({ matches }) => {
    const locale = localeFromMatches(matches)
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        ...seo({
          title:
            locale === 'fr'
              ? 'Cat Years — quel âge a votre chat en années humaines ?'
              : 'Cat Years — how old is your cat in human years?',
          description:
            locale === 'fr'
              ? 'Affichez votre chat sur le mur d’internet. Partagez une photo et une date de naissance : Cat Years révèle son âge réel en années humaines, avec des faits félins extrêmement scientifiques.'
              : 'Put your cat on the wall of the internet. Share a photo and birthday, and Cat Years reveals their real age in human years, complete with extremely scientific cat facts.',
        }),
      ],
      links: [
        { rel: 'stylesheet', href: appCss },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossOrigin: 'anonymous',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
        },
      ],
    }
  },
  errorComponent: (props) => (
    <RootDocument locale="en">
      <DefaultCatchBoundary {...props} />
    </RootDocument>
  ),
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

function RootComponent() {
  const { locale } = Route.useRouteContext()
  return (
    <RootDocument locale={locale}>
      <Outlet />
    </RootDocument>
  )
}

function LocaleToggle() {
  const i18n = useI18n()
  const router = useRouter()

  function choose(next: Locale) {
    if (next === i18n.locale) return
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`
    void router.invalidate()
  }

  return (
    <div
      role="group"
      aria-label={i18n.langLabel}
      className="ml-1 flex items-center rounded-full border-2 border-ink bg-paper p-0.5"
    >
      {LOCALES.map((code) => {
        const active = i18n.locale === code
        return (
          <button
            key={code}
            type="button"
            onClick={() => choose(code)}
            aria-pressed={active}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wider transition-colors',
              active ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-cream',
            )}
          >
            {code}
          </button>
        )
      })}
    </div>
  )
}

function SiteHeader() {
  const i18n = useI18n()
  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink/10 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl border-2 border-ink bg-butter text-xl shadow-sticker-sm">
            🐾
          </span>
          <span className="font-display text-2xl font-black tracking-tight">
            Cat Years
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="hidden rounded-full px-3.5 py-2 text-sm font-bold text-ink-soft transition-colors hover:bg-cream hover:text-ink sm:block"
            activeProps={{
              className:
                'hidden sm:block rounded-full px-3.5 py-2 text-sm font-bold text-ink bg-cream',
            }}
          >
            {i18n.nav.wall}
          </Link>
          <Link
            to="/new"
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-tangerine px-4 py-2 text-sm font-bold text-paper shadow-sticker-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {i18n.nav.addCat}
          </Link>
          <LocaleToggle />
        </nav>
      </div>
    </header>
  )
}

function SiteFooter() {
  const i18n = useI18n()
  return (
    <footer className="mt-16 border-t-2 border-ink/10 bg-cream/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-ink-soft sm:flex-row">
        <p className="font-semibold">
          {i18n.footer.builtLead}{' '}
          <span className="font-black text-ink">{i18n.footer.brand}</span>{' '}
          {i18n.footer.builtTail}
        </p>
        <p>{i18n.footer.disclaimer}</p>
      </div>
    </footer>
  )
}

function RootDocument({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-dvh">
        <I18nProvider locale={locale}>
          <div className="grain" aria-hidden="true" />
          <SiteHeader />
          <main className="min-h-[60vh]">{children}</main>
          <SiteFooter />
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  )
}
