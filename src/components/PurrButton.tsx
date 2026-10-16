import { useState } from 'react'
import { PawPrint } from 'lucide-react'
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

  async function handlePurr() {
    if (pending) return
    setPending(true)
    setBurst(true)
    setCount((c) => c + 1)
    window.setTimeout(() => setBurst(false), 650)
    try {
      const { purrs } = await purrCatFn({ data: { slug } })
      setCount(purrs)
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
      aria-label={i18n.detail.purrAria}
      className="group inline-flex items-center gap-3 rounded-full border-2 border-ink bg-butter px-5 py-2.5 font-bold shadow-sticker-sm transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
    >
      <PawPrint
        className={cn(
          'size-5 transition-transform',
          burst ? 'animate-wiggle motion-reduce:animate-none' : 'group-hover:scale-110',
        )}
        aria-hidden
      />
      <span className="tabular-nums">{i18n.formatNumber(count)}</span>
      <span className="text-sm font-bold text-ink/70">{i18n.detail.purrWord}</span>
    </button>
  )
}
