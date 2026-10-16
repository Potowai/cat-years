import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '~/lib/i18n'
import { cn } from '~/lib/utils'

export function CatCarousel({
  photos,
  name,
  className,
}: {
  photos: string[]
  name: string
  className?: string
}) {
  const i18n = useI18n()
  const list = photos.length > 0 ? photos : ['']
  const total = list.length
  const [index, setIndex] = useState(0)
  const current = Math.min(index, total - 1)

  function go(step: number) {
    setIndex((i) => (i + step + total) % total)
  }

  const arrow =
    'absolute top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border-2 border-ink bg-paper/90 shadow-sticker-sm transition-transform hover:-translate-y-1/2 hover:scale-105 active:scale-95'

  return (
    <div
      className={cn('relative', className)}
      role="group"
      aria-roledescription="carousel"
      aria-label={total > 1 ? i18n.detail.photoOf(current + 1, total) : name}
      tabIndex={total > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (total < 2) return
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          go(-1)
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          go(1)
        }
      }}
    >
      <img
        src={list[current]}
        alt={name}
        draggable={false}
        className="block w-full rounded-[16px] border-2 border-ink object-cover"
      />

      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={i18n.detail.prevPhoto}
            className={cn(arrow, 'left-2')}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={i18n.detail.nextPhoto}
            className={cn(arrow, 'right-2')}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-ink bg-paper/85 px-2 py-1">
            {list.map((photo, i) => (
              <button
                key={`${photo}-${i}`}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={i18n.detail.photoOf(i + 1, total)}
                aria-current={i === current}
                className={cn(
                  'size-2.5 rounded-full border-2 border-ink transition-transform hover:scale-125',
                  i === current ? 'bg-ink' : 'bg-paper',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
