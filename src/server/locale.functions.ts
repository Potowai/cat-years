import { createServerFn } from '@tanstack/react-start'
import { getCookie, getRequestHeader } from '@tanstack/react-start/server'
import { LOCALE_COOKIE, resolveLocale, type Locale } from '~/lib/locale'

/**
 * Detects the visitor's language from, in priority order: an explicit locale
 * cookie, their region (Vercel geo headers), and finally their browser's
 * Accept-Language header.
 */
export const getLocaleFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Locale> => {
    return resolveLocale({
      cookie: getCookie(LOCALE_COOKIE),
      acceptLanguage: getRequestHeader('accept-language'),
      country: getRequestHeader('x-vercel-ip-country'),
      region: getRequestHeader('x-vercel-ip-country-region'),
    })
  },
)
