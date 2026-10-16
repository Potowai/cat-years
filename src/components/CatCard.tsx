import { Link } from '@tanstack/react-router'
import { Images, PawPrint } from 'lucide-react'
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
          <div className="absolute left-2.5 top-2.5">
            <Chip tone={i18n.stageAccent(age.stageId)}>
              <span aria-hidden>{i18n.stageEmoji(age.stageId)}</span>
              {i18n.stageLabel(age.stageId)}
            </Chip>
          </div>
          {cat.photos.length > 1 ? (
            <div className="absolute right-2.5 top-2.5">
              <Chip tone="cream">
                <Images className="size-3" aria-hidden />
                {cat.photos.length}
              </Chip>
            </div>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3 px-1.5 pb-1 pt-3">
          <h3 className="min-w-0 truncate text-2xl font-black leading-none">
            {cat.name}
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-ink-soft">
            <PawPrint className="size-4" aria-hidden />
            {i18n.formatNumber(cat.purrs)}
          </span>
        </div>

        <p className="px-1.5 pb-1 text-sm font-semibold text-ink-soft">
          <span className="text-tangerine">{i18n.humanAgeLabel(age)}</span>{' '}
          {i18n.card.humanYears} &middot; {i18n.catAgeLabel(age)}
          {i18n.card.oldSuffix ? ` ${i18n.card.oldSuffix}` : ''}
        </p>
      </article>
    </Link>
  )
}
