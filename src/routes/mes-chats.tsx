import { useEffect, useState } from 'react'
import {
  createFileRoute,
  Link,
  useNavigate,
} from '@tanstack/react-router'
import { ArrowLeft, Link2, PawPrint } from 'lucide-react'
import { CatCard } from '~/components/CatCard'
import { buttonClass, Chip, Input, Label } from '~/components/ui'
import {
  getOwnerName,
  getOwnerToken,
  getOwnership,
  listOwnedIds,
  rememberOwnerName,
  setOwnerToken,
} from '~/lib/tokens'
import { getDict, localeFromMatches, useI18n } from '~/lib/i18n'
import { seo } from '~/lib/seo'
import type { CatDTO } from '~/lib/types'
import { claimCatFn, listMyCatsFn, setOwnerNameFn } from '~/server/cats.functions'

export const Route = createFileRoute('/mes-chats')({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token:
      typeof search.token === 'string' && search.token.length >= 10
        ? search.token
        : undefined,
  }),
  head: ({ matches }) => {
    const d = getDict(localeFromMatches(matches))
    return {
      meta: [
        ...seo({ title: d.myCats.title, description: d.myCats.intro }),
        { name: 'robots', content: 'noindex' },
        { name: 'referrer', content: 'no-referrer' },
      ],
    }
  },
  component: MyCats,
})

function MyCats() {
  const i18n = useI18n()
  const { token: urlToken } = Route.useSearch()
  const navigate = useNavigate()

  const [token, setToken] = useState<string | null>(null)
  const [cats, setCats] = useState<CatDTO[] | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [claimed, setClaimed] = useState(0)

  // Adopt an owner link (`?token=…`) or fall back to this browser's key.
  useEffect(() => {
    if (urlToken) {
      setOwnerToken(urlToken)
      setToken(urlToken)
      void navigate({ to: '/mes-chats', search: {}, replace: true })
      return
    }
    setToken(getOwnerToken())
  }, [urlToken, navigate])

  useEffect(() => {
    setName(getOwnerName())
  }, [])

  // Link older cats (created before owner keys) that this browser can prove,
  // then load the whole collection.
  useEffect(() => {
    if (!token) return
    let cancelled = false
    void (async () => {
      const ownedName = getOwnerName()
      const provable = listOwnedIds()
        .map((id) => ({ id, catToken: getOwnership(id) }))
        .filter((x): x is { id: string; catToken: string } => Boolean(x.catToken))

      let linked = 0
      for (const item of provable) {
        try {
          const res = await claimCatFn({
            data: {
              id: item.id,
              token: item.catToken,
              ownerToken: token,
              ownerName: ownedName || undefined,
            },
          })
          if (res) linked += 1
        } catch {
          /* not ours to claim — ignore */
        }
      }

      const list = await listMyCatsFn({ data: { ownerToken: token } })
      if (cancelled) return
      setClaimed(linked)
      setCats(list)
      // Prefill the pseudo from the server if this browser never set one.
      if (!getOwnerName() && list[0]?.ownerName) {
        rememberOwnerName(list[0].ownerName)
        setName(list[0].ownerName)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  async function saveName() {
    if (!token) return
    setSaving(true)
    try {
      await setOwnerNameFn({ data: { ownerToken: token, ownerName: name } })
      rememberOwnerName(name.trim())
      const list = await listMyCatsFn({ data: { ownerToken: token } })
      setCats(list)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function copyOwnerLink() {
    if (!token) return
    const url = `${window.location.origin}/mes-chats?token=${token}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt(i18n.myCats.copyLink, url)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
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

      <header className="mt-6">
        <Chip tone="butter" className="animate-pop">
          {i18n.myCats.badge}
        </Chip>
        <h1 className="mt-5 text-4xl font-black leading-[1.05] sm:text-5xl">
          {i18n.myCats.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg font-medium text-ink-soft">
          {i18n.myCats.intro}
        </p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-start">
        <section>
          {cats === null ? (
            <p className="text-ink-soft">{i18n.myCats.loading}</p>
          ) : cats.length === 0 ? (
            <div className="rounded-[28px] border-2 border-dashed border-ink/40 bg-cream/40 px-6 py-14 text-center">
              <p className="mx-auto max-w-md font-medium text-ink-soft">
                {i18n.myCats.empty}
              </p>
              <Link to="/new" className={buttonClass({ className: 'mt-6' })}>
                <PawPrint className="size-5" aria-hidden />
                {i18n.myCats.emptyCta}
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm font-bold uppercase tracking-wider text-ink-soft">
                {i18n.myCats.count(cats.length)}
                {claimed > 0 ? ` · ${i18n.myCats.claimed(claimed)}` : ''}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {cats.map((cat) => (
                  <div key={cat.id} className="min-w-0">
                    <CatCard cat={cat} />
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Link
                        to="/cats/$catSlug"
                        params={{ catSlug: cat.slug }}
                        className={buttonClass({ variant: 'outline', size: 'sm' })}
                      >
                        {i18n.myCats.view}
                      </Link>
                      <Link
                        to="/cats/$catSlug/edit"
                        params={{ catSlug: cat.slug }}
                        className={buttonClass({ size: 'sm' })}
                      >
                        {i18n.detail.edit}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <div className="rounded-[28px] border-2 border-ink bg-paper p-5 shadow-sticker">
            <h2 className="text-xl font-black">{i18n.myCats.pseudoTitle}</h2>
            <div className="mt-3">
              <Label htmlFor="owner-name">{i18n.myCats.pseudoLabel}</Label>
              <Input
                id="owner-name"
                value={name}
                maxLength={40}
                placeholder={i18n.myCats.pseudoPlaceholder}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <p className="mt-2 text-xs font-medium text-ink-soft">
              {i18n.myCats.pseudoHint}
            </p>
            <button
              type="button"
              onClick={saveName}
              disabled={saving}
              className={buttonClass({ size: 'sm', className: 'mt-3' })}
            >
              {saved ? i18n.myCats.saved : i18n.myCats.save}
            </button>
          </div>

          <div className="rounded-[28px] border-2 border-ink bg-ink p-5 text-paper shadow-sticker">
            <h2 className="text-xl font-black">{i18n.myCats.linkTitle}</h2>
            <button
              type="button"
              onClick={copyOwnerLink}
              className={buttonClass({
                variant: 'butter',
                size: 'sm',
                className: 'mt-3',
              })}
            >
              <Link2 className="size-4" aria-hidden />
              {copied ? i18n.myCats.linkCopied : i18n.myCats.copyLink}
            </button>
            <p className="mt-3 text-sm font-medium text-cream/80">
              {i18n.myCats.linkHint}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
