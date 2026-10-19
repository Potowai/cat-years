import { useEffect, useRef, useState } from 'react'
import { PawPrint } from 'lucide-react'
import { useI18n } from '~/lib/i18n'
import type { PurrBudget } from '~/lib/types'
import { purrCatFn } from '~/server/cats.functions'
import { cn } from '~/lib/utils'

/** A burst of taps is batched into one request this long after the last one. */
const FLUSH_DELAY_MS = 400
/** Long bursts also flush this often, so a stale budget is caught mid-burst. */
const FLUSH_EVERY = 25

/**
 * Purring is unlimited, so the count ticks up on every tap and the taps are
 * batched into one request. The page ships the visitor's remaining budget with
 * the cat, so the tap that would cross the line is refused immediately — the
 * quote appears with the cap, not a round trip later.
 */
export function PurrButton({
  slug,
  initial,
  budget,
}: {
  slug: string
  initial: number
  budget: PurrBudget
}) {
  const i18n = useI18n()
  const { limit, windowMs } = budget
  const opensBlocked = budget.remaining <= 0 && budget.windowEndsAt !== null
  const [count, setCount] = useState(initial)
  const [burst, setBurst] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  // The quote is chosen after mount: a random line during SSR would not match
  // the server's HTML and React would throw the tree away on hydration.
  const [block, setBlock] = useState<{ until: number } | null>(
    opensBlocked ? { until: budget.windowEndsAt as number } : null,
  )
  const [quote, setQuote] = useState<string | null>(null)

  /** Purrs this visitor may still spend in the current window, as best we know. */
  const remaining = useRef(opensBlocked ? 0 : budget.remaining || limit)
  /** When the open window ends, or null when none is open. */
  const windowEnd = useRef(budget.windowEndsAt)
  /** Taps not yet acknowledged by the server. */
  const pending = useRef(0)
  const sending = useRef(false)
  const timer = useRef<number | null>(null)
  const burstTimer = useRef<number | null>(null)

  function blockNow(until?: number | null) {
    const lines = i18n.detail.purrLimit
    setBlock({ until: until ?? windowEnd.current ?? Date.now() + windowMs })
    setQuote(lines[Math.floor(Math.random() * lines.length)] ?? '')
  }

  function schedule() {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      timer.current = null
      void flush()
    }, FLUSH_DELAY_MS)
  }

  async function flush() {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    if (sending.current || pending.current === 0) return
    const batch = Math.min(pending.current, limit)
    pending.current -= batch
    sending.current = true
    try {
      const res = await purrCatFn({ data: { slug, count: batch } })
      // The reply covers `batch`; the queued taps are still unspent.
      windowEnd.current = res.budget.windowEndsAt
      const room = Math.max(0, res.budget.remaining - pending.current)
      remaining.current = room

      if (res.applied < batch) {
        // Some taps were over the line: drop the rest and say so.
        pending.current = 0
        setCount(res.purrs)
        blockNow(res.budget.windowEndsAt)
      } else {
        setCount(res.purrs + pending.current)
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
    if (block) return
    const now = Date.now()
    if (windowEnd.current !== null && now >= windowEnd.current) {
      // The window rolled over, so the budget tops up.
      remaining.current = limit
      windowEnd.current = null
    }
    if (remaining.current <= 0) {
      // Refuse the tap right here: the visitor is out of purrs for this window.
      blockNow()
      return
    }

    remaining.current -= 1
    pending.current += 1
    setCount((c) => c + 1)
    setBurst(true)
    if (burstTimer.current !== null) window.clearTimeout(burstTimer.current)
    burstTimer.current = window.setTimeout(() => setBurst(false), 650)

    if (pending.current >= FLUSH_EVERY) void flush()
    else schedule()
  }

  // A page that loads mid-block gets its quote once we are on the client.
  useEffect(() => {
    if (!block || quote !== null) return
    const lines = i18n.detail.purrLimit
    setQuote(lines[Math.floor(Math.random() * lines.length)] ?? '')
  }, [block, quote, i18n])

  // Count the wait down, then hand the budget back and unblock.
  useEffect(() => {
    if (!block) {
      setSecondsLeft(0)
      return
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((block.until - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        remaining.current = limit
        windowEnd.current = null
        setBlock(null)
        setQuote(null)
      }
    }
    tick()
    const id = window.setInterval(tick, 500)
    return () => window.clearInterval(id)
  }, [block, limit])

  // Best effort: hand over the last few taps if they leave mid-burst.
  useEffect(() => {
    const flushTail = () => {
      if (pending.current > 0 && !sending.current) {
        const tail = Math.min(pending.current, limit)
        pending.current = 0
        void purrCatFn({ data: { slug, count: tail } })
      }
    }
    window.addEventListener('pagehide', flushTail)
    return () => {
      window.removeEventListener('pagehide', flushTail)
      if (timer.current !== null) window.clearTimeout(timer.current)
      if (burstTimer.current !== null) window.clearTimeout(burstTimer.current)
    }
  }, [slug, limit])

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handlePurr}
        disabled={block !== null}
        aria-label={i18n.detail.purrAria}
        className={cn(
          'group inline-flex items-center gap-3 rounded-full border-2 border-ink px-5 py-2.5 font-bold transition-transform duration-150',
          block
            ? 'cursor-not-allowed bg-paper/60 text-ink/50'
            : 'bg-butter shadow-sticker-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none',
        )}
      >
        <PawPrint
          className={cn(
            'size-5 transition-transform',
            burst && !block
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
      {block ? (
        <div role="status" className="flex flex-col gap-1">
          {quote ? (
            <p className="max-w-xs text-sm font-semibold text-ink/70">
              {quote}
            </p>
          ) : null}
          {secondsLeft > 0 ? (
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
              {i18n.detail.purrRetryIn(secondsLeft)}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
