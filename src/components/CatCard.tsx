import { Link } from '@tanstack/react-router'
import { Images, PawPrint, UserRound } from 'lucide-react'
import { computeCatAge } from '~/lib/catAge'
import { useI18n } from '~/lib/i18n'
import type { CatDTO } from '~/lib/types'
import { cn } from '~/lib/utils'
import { Chip } from './ui'

export function CatCard({
  cat,
  index = 0,
  className,
}: {
  cat: CatDTO
  index?: number
  className?: string
}) {
  const i18n = useI18n()
  const age = computeCatAge(cat.birthdate)

  return (
    <Link
      to="/cats/$catSlug"
      params={{ catSlug: cat.slug }}
      className={cn('group block break-inside-avoid', className)}
    >
      <article
        className="relative mb-5 rounded-[26px] border-2 border-ink bg-paper p-2.5 shadow-sticker transition-transform duration-200 ease-out group-hover:-translate-y-1.5 group-hover:rotate-[-1.2deg] group-focus-visible:-translate-y-1.5"
        style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      >
        <div className="relative overflow-hidden rounded-[18px] border-2 border-ink bg-cream">
          <img
            src={cat.photoUrl}
            alt={cat.name}
            loading="lazy"
            draggable={false}
            className="block w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute left-2 top-2 max-w-[calc(100%-1rem)] sm:left-2.5 sm:top-2.5">
            <Chip
              tone={i18n.stageAccent(age.stageId)}
              className="max-w-full min-w-0 px-2 py-0.5 text-[10px] tracking-wide sm:px-3 sm:py-1 sm:text-xs sm:tracking-wider"
            >
              <span aria-hidden>{i18n.stageEmoji(age.stageId)}</span>
              <span className="truncate min-w-0">{i18n.stageLabel(age.stageId)}</span>
            </Chip>
          </div>
          {cat.photos.length > 1 ? (
            <div className="absolute right-2 top-2 sm:right-2.5 sm:top-2.5">
              <Chip
                tone="cream"
                className="px-2 py-0.5 text-[10px] sm:px-3 sm:py-1 sm:text-xs"
              >
                <Images className="size-3" aria-hidden />
                {cat.photos.length}
              </Chip>
            </div>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-2 px-1.5 pb-1 pt-3 sm:gap-3">
          <h3 className="min-w-0 truncate text-xl font-black leading-none sm:text-2xl">
            {cat.name}
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-ink-soft sm:text-sm">
            <PawPrint className="size-4" aria-hidden />
            {i18n.formatNumber(cat.purrs)}
          </span>
        </div>

        <p className="px-1.5 text-xs font-semibold text-ink-soft sm:text-sm">
          <span className="text-tangerine">{i18n.humanAgeLabel(age)}</span>{' '}
          {i18n.card.humanYears} &middot; {i18n.catAgeLabel(age)}
          {i18n.card.oldSuffix ? ` ${i18n.card.oldSuffix}` : ''}
        </p>

        {cat.ownerName ? (
          <p className="flex items-center gap-1 px-1.5 pb-1 pt-1 text-xs font-bold text-ink-soft/80">
            <UserRound className="size-3.5" aria-hidden />
            {i18n.detail.byOwner(cat.ownerName)}
          </p>
        ) : null}
      </article>
    </Link>
  )
}
