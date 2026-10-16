import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Pencil, Trash2 } from 'lucide-react'
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

  if (!token) return null

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
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-ink/40 bg-cream/40 p-3">
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
  )
}
