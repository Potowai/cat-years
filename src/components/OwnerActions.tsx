import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Link2, Pencil, Trash2 } from 'lucide-react'
import { useI18n } from '~/lib/i18n'
import { forgetOwnership } from '~/lib/tokens'
import { useOwnership } from '~/lib/useOwnership'
import { deleteCatFn } from '~/server/cats.functions'
import { buttonClass } from './ui'

export function OwnerActions({
  catId,
  slug,
}: {
  catId: string
  slug: string
}) {
  const i18n = useI18n()
  const token = useOwnership(catId)
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!token) return null

  function editLink(t: string) {
    return `${window.location.origin}/cats/${slug}/edit?token=${t}`
  }

  async function copyEditLink() {
    if (!token) return
    const url = editLink(token)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt(i18n.detail.copyLink, url)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (!token) return
    setBusy(true)
    try {
      await deleteCatFn({ data: { id: slug, token } })
      forgetOwnership(catId)
      await navigate({ to: '/' })
    } catch (err) {
      window.alert(
        i18n.errorMessage(err instanceof Error ? err.message : undefined),
      )
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-cream/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-bold text-ink-soft">
          {i18n.detail.ownerBadge}
        </span>
        <Link
          to="/cats/$catSlug/edit"
          params={{ catSlug: slug }}
          className={buttonClass({ variant: 'outline', size: 'sm' })}
        >
          <Pencil className="size-4" aria-hidden />
          {i18n.detail.edit}
        </Link>
        <button
          type="button"
          onClick={copyEditLink}
          className={buttonClass({ variant: 'outline', size: 'sm' })}
        >
          <Link2 className="size-4" aria-hidden />
          {copied ? i18n.detail.linkCopied : i18n.detail.copyLink}
        </button>
        {confirming ? (
          <>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className={buttonClass({ variant: 'danger', size: 'sm' })}
            >
              <Trash2 className="size-4" aria-hidden />
              {busy ? i18n.detail.deleting : i18n.detail.confirmDelete}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={buttonClass({ variant: 'ghost', size: 'sm' })}
            >
              {i18n.detail.cancel}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className={buttonClass({ variant: 'ghost', size: 'sm' })}
          >
            <Trash2 className="size-4" aria-hidden />
            {i18n.detail.delete}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs font-medium text-ink-soft">
        {i18n.detail.linkHint}
      </p>
    </div>
  )
}
