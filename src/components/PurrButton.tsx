import { useState } from 'react'
import { Check, PawPrint } from 'lucide-react'
import { useI18n } from '~/lib/i18n'
import { purrCatFn } from '~/server/cats.functions'
import { cn } from '~/lib/utils'

export function PurrButton({
  slug,
  initial,
}: {
  slug: string
  initial: number
}) {
  const i18n = useI18n()
  const [count, setCount] = useState(initial)
  const [burst, setBurst] = useState(false)
  const [pending, setPending] = useState(false)
  // One purr per visitor per cat — the server enforces it, we just reflect it.
  const [purred, setPurred] = useState(false)

  async function handlePurr() {
    if (pending || purred) return
    setPending(true)
    setBurst(true)
    setCount((c) => c + 1)
    window.setTimeout(() => setBurst(false), 650)
    try {
      const { purrs } = await purrCatFn({ data: { slug } })
      setCount(purrs)
      setPurred(true)
    } catch {
      setCount((c) => Math.max(initial, c - 1))
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handlePurr}
      aria-label={purred ? i18n.detail.purrDone : i18n.detail.purrAria}
      disabled={purred}
      className={cn(
        'group inline-flex items-center gap-3 rounded-full border-2 border-ink px-5 py-2.5 font-bold transition-transform duration-150',
        purred
          ? 'cursor-default bg-sage text-paper'
          : 'bg-butter shadow-sticker-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none',
      )}
    >
      {purred ? (
        <Check className="size-5" aria-hidden />
      ) : (
        <PawPrint
          className={cn(
            'size-5 transition-transform',
            burst ? 'animate-wiggle motion-reduce:animate-none' : 'group-hover:scale-110',
          )}
          aria-hidden
        />
      )}
      <span className="tabular-nums">{i18n.formatNumber(count)}</span>
      <span className="text-sm font-bold text-ink/70">
        {i18n.detail.purrWord}
      </span>
    </button>
  )
}
