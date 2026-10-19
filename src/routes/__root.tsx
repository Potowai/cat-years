/// <reference types="vite/client" />
import type { QueryClient } from '@tanstack/react-query'
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { Menu, Plus, X } from 'lucide-react'
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
        { name: 'application-name', content: 'Cat Years' },
        { name: 'apple-mobile-web-app-title', content: 'Cat Years' },
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
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
        {
          rel: 'icon',
          href: '/favicon-32.png',
          type: 'image/png',
          sizes: '32x32',
        },
        {
          rel: 'apple-touch-icon',
          href: '/apple-touch-icon.png',
          sizes: '180x180',
        },
        { rel: 'manifest', href: '/manifest.webmanifest' },
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
    const secure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax${secure}`
    void router.invalidate()
  }

  return (
    <div
      role="group"
      aria-label={i18n.langLabel}
      className="ml-1 flex shrink-0 items-center rounded-full border-2 border-ink bg-paper p-0.5"
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

function NavLink({
  to,
  exact,
  children,
  onNavigate,
}: {
  to: string
  exact?: boolean
  children: React.ReactNode
  onNavigate?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      activeOptions={exact ? { exact: true } : undefined}
      className="shrink-0 whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-bold text-ink-soft transition-colors hover:bg-cream hover:text-ink sm:px-2.5 sm:text-sm"
      activeProps={{
        className:
          'shrink-0 whitespace-nowrap rounded-full px-2 py-1.5 text-xs font-bold bg-cream text-ink sm:px-2.5 sm:text-sm',
      }}
    >
      {children}
    </Link>
  )
}

const MOBILE_MENU_ID = 'site-nav'

function SiteHeader() {
  const i18n = useI18n()
  const [open, setOpen] = React.useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Close the drawer whenever a navigation lands, including browser back/forward.
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  React.useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink/10 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src="/favicon.svg"
            alt=""
            width={40}
            height={40}
            className="size-9 shrink-0 sm:size-10"
          />
          <span className="truncate font-display text-xl font-black tracking-tight sm:text-2xl">
            Cat Years
          </span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" exact>
            {i18n.nav.wall}
          </NavLink>
          <NavLink to="/mes-chats">{i18n.nav.myCats}</NavLink>
          <NavLink to="/calcul-age">{i18n.nav.how}</NavLink>
          <NavLink to="/lettres-annees">{i18n.nav.letters}</NavLink>
          <Link
            to="/new"
            className="ml-1 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-ink bg-tangerine px-4 py-2 text-sm font-bold text-paper shadow-sticker-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {i18n.nav.addCat}
          </Link>
          <LocaleToggle />
        </nav>

        {/* Mobile controls */}
        <div className="flex shrink-0 items-center gap-2 md:hidden">
          <Link
            to="/new"
            aria-label={i18n.nav.addCat}
            className="grid size-9 place-items-center rounded-full border-2 border-ink bg-tangerine text-paper shadow-sticker-sm active:translate-y-0 active:shadow-none"
          >
            <Plus className="size-5" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={MOBILE_MENU_ID}
            aria-label={i18n.nav.menu}
            className="grid size-9 place-items-center rounded-full border-2 border-ink bg-paper shadow-sticker-sm active:translate-y-0 active:shadow-none"
          >
            {open ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {open ? (
        <div
          id={MOBILE_MENU_ID}
          className="border-t-2 border-ink/10 bg-paper px-4 pb-4 pt-2 md:hidden"
        >
          <nav className="flex flex-col gap-1">
            <MobileNavLink to="/" exact onNavigate={() => setOpen(false)}>
              {i18n.nav.wall}
            </MobileNavLink>
            <MobileNavLink to="/mes-chats" onNavigate={() => setOpen(false)}>
              {i18n.nav.myCats}
            </MobileNavLink>
            <MobileNavLink to="/calcul-age" onNavigate={() => setOpen(false)}>
              {i18n.nav.how}
            </MobileNavLink>
            <MobileNavLink to="/lettres-annees" onNavigate={() => setOpen(false)}>
              {i18n.nav.letters}
            </MobileNavLink>
          </nav>
          <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-ink/10 pt-3">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              {i18n.langLabel}
            </span>
            <LocaleToggle />
          </div>
        </div>
      ) : null}
    </header>
  )
}

function MobileNavLink({
  to,
  exact,
  children,
  onNavigate,
}: {
  to: string
  exact?: boolean
  children: React.ReactNode
  onNavigate: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      activeOptions={exact ? { exact: true } : undefined}
      className="rounded-2xl px-3 py-2.5 text-base font-bold text-ink-soft transition-colors hover:bg-cream hover:text-ink"
      activeProps={{
        className:
          'rounded-2xl px-3 py-2.5 text-base font-bold bg-cream text-ink',
      }}
    >
      {children}
    </Link>
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
