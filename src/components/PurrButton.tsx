import { useEffect, useRef, useState } from 'react'
import { PawPrint } from 'lucide-react'
import { useI18n } from '~/lib/i18n'
import { purrCatFn } from '~/server/cats.functions'
import { cn } from '~/lib/utils'

/** A burst of taps is batched into one request this long after the last one. */
const FLUSH_DELAY_MS = 400
/** Mirrors the server's per-request cap. */
const MAX_BATCH = 100

/**
 * Purring is unlimited, so the count ticks up on every tap and the taps are
 * batched into one request. The server allows 100 purrs per minute per cat;
 * past that we drop the extra taps and say so.
 */
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
  const [blocked, setBlocked] = useState(false)
  const [quote, setQuote] = useState<string | null>(null)
  /** Taps not yet acknowledged by the server. */
  const pending = useRef(0)
  const sending = useRef(false)
  const timer = useRef<number | null>(null)
  const burstTimer = useRef<number | null>(null)
  const cooldownTimer = useRef<number | null>(null)
  const cooldownUntil = useRef(0)

  function schedule() {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = null
      void flush()
    }, FLUSH_DELAY_MS)
  }

  async function flush() {
    if (sending.current || pending.current === 0) return
    const batch = Math.min(pending.current, MAX_BATCH)
    pending.current -= batch
    sending.current = true
    try {
      const { purrs, applied, retryAfterMs } = await purrCatFn({
        data: { slug, count: batch },
      })
      // The reply already includes this batch; keep any taps made meanwhile.
      setCount(purrs + pending.current)
      if (applied < batch) {
        pending.current = 0
        const wait = Math.max(retryAfterMs, 1000)
        cooldownUntil.current = Date.now() + wait
        const lines = i18n.detail.purrLimit
        setQuote(lines[Math.floor(Math.random() * lines.length)] ?? null)
        setBlocked(true)
        if (cooldownTimer.current !== null) {
          window.clearTimeout(cooldownTimer.current)
        }
        cooldownTimer.current = window.setTimeout(() => {
          cooldownTimer.current = null
          setBlocked(false)
          setQuote(null)
        }, wait)
      } else {
        setBlocked(false)
        setQuote(null)
      }
    } catch {
      // The request never landed: give the taps back.
      pending.current = 0
      setCount((c) => Math.max(initial, c - batch))
    } finally {
      sending.current = false
      if (pending.current > 0) schedule()
    }
  }

  function handlePurr() {
    if (Date.now() < cooldownUntil.current) return
    pending.current += 1
    setCount((c) => c + 1)
    setBurst(true)
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current)
    burstTimer.current = window.setTimeout(() => setBurst(false), 650)
    schedule()
  }

  // Best effort: hand over the last few taps if they leave mid-burst.
  useEffect(() => {
    const flushTail = () => {
      if (pending.current > 0 && !sending.current) {
        const tail = Math.min(pending.current, MAX_BATCH)
        pending.current = 0
        void purrCatFn({ data: { slug, count: tail } })
      }
    }
    window.addEventListener('pagehide', flushTail)
    return () => {
      window.removeEventListener('pagehide', flushTail)
      if (timer.current !== null) window.clearTimeout(timer.current)
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current)
      if (cooldownTimer.current !== null) window.clearTimeout(cooldownTimer.current)
    }
  }, [slug])

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handlePurr}
        disabled={blocked}
        aria-label={i18n.detail.purrAria}
        className={cn(
          'group inline-flex items-center gap-3 rounded-full border-2 border-ink px-5 py-2.5 font-bold transition-transform duration-150',
          blocked
            ? 'cursor-not-allowed bg-paper/60 text-ink/50'
            : 'bg-butter shadow-sticker-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none',
        )}
      >
        <PawPrint
          className={cn(
            'size-5 transition-transform',
            burst && !blocked
              ? 'animate-wiggle motion-reduce:animate-none'
              : 'group-hover:scale-110',
          )}
          aria-hidden
        />
        <span className="tabular-nums">{i18n.formatNumber(count)}</span>
        <span className="text-sm font-bold text-ink/70">
          {i18n.detail.purrWord}
        </span>
      </button>
      {blocked ? (
        <p role="status" className="max-w-xs text-sm font-semibold text-ink/70">
          {quote}
        </p>
      ) : null}
    </div>
  )
}
