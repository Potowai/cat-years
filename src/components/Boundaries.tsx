import { Link } from '@tanstack/react-router'
import { useI18n } from '~/lib/i18n'

export function NotFound() {
  const i18n = useI18n()
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl">🙀</div>
      <h1 className="mt-6 text-5xl font-black sm:text-6xl">
        {i18n.notFound.title}
      </h1>
      <p className="mt-4 text-lg text-ink-soft">{i18n.notFound.text}</p>
      <Link
        to="/"
        className="mt-8 rounded-full border-2 border-ink bg-tangerine px-6 py-3 font-bold text-paper shadow-sticker-sm transition-transform hover:-translate-y-0.5 active:translate-y-0"
      >
        {i18n.notFound.cta}
      </Link>
    </div>
  )
}

export function DefaultCatchBoundary({
  error,
  reset,
}: {
  error: unknown
  reset?: () => void
}) {
  const i18n = useI18n()
  const message =
    error instanceof Error
      ? i18n.errorMessage(error.message)
      : typeof error === 'string'
        ? i18n.errorMessage(error)
        : i18n.errorBoundary.defaultMessage
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="text-7xl">😾</div>
      <h1 className="mt-6 text-4xl font-black sm:text-5xl">
        {i18n.errorBoundary.title}
      </h1>
      <p className="mt-4 max-w-md text-ink-soft">{message}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset?.()}
          className="rounded-full border-2 border-ink bg-butter px-6 py-3 font-bold shadow-sticker-sm transition-transform hover:-translate-y-0.5"
        >
          {i18n.errorBoundary.retry}
        </button>
        <a
          href="/"
          className="rounded-full border-2 border-ink bg-paper px-6 py-3 font-bold shadow-sticker-sm transition-transform hover:-translate-y-0.5"
        >
          {i18n.errorBoundary.home}
        </a>
      </div>
    </div>
  )
}
