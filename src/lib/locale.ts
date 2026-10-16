export type Locale = 'en' | 'fr'

export const LOCALES: readonly Locale[] = ['en', 'fr'] as const
export const DEFAULT_LOCALE: Locale = 'en'

/** Cookies carrying an explicit, user-chosen locale. */
export const LOCALE_COOKIE = 'locale'

/**
 * Countries where French is the primary day-to-day language. Visitors from
 * these regions get French automatically.
 */
const FRENCH_COUNTRIES = new Set([
  'FR', // France
  'MC', // Monaco
  'LU', // Luxembourg
  'SN', // Sénégal
  'CI', // Côte d'Ivoire
  'ML', // Mali
  'BF', // Burkina Faso
  'NE', // Niger
  'GN', // Guinée
  'TG', // Togo
  'BJ', // Bénin
  'CM', // Cameroun
  'GA', // Gabon
  'CG', // Congo
  'CD', // RD Congo
  'MG', // Madagascar
  'HT', // Haïti
  'RW', // Rwanda
  'BI', // Burundi
  'DJ', // Djibouti
  'KM', // Comores
  'GP', // Guadeloupe
  'MQ', // Martinique
  'GF', // Guyane
  'RE', // La Réunion
  'YT', // Mayotte
  'PM', // Saint-Pierre-et-Miquelon
  'NC', // Nouvelle-Calédonie
  'PF', // Polynésie française
  'WF', // Wallis-et-Futuna
  'VU', // Vanuatu
])

/** Regions (ISO 3166-2) inside otherwise non-French countries. */
const FRENCH_REGIONS: Record<string, Set<string>> = {
  CA: new Set(['QC']), // Québec
  BE: new Set(['BRU', 'WAL', 'VAN']), // Bruxelles / Wallonie
  CH: new Set(['GE', 'VD', 'NE', 'JU', 'FR', 'VS']), // cantons romands
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null
  const tag = value.trim().toLowerCase()
  if (tag.startsWith('fr')) return 'fr'
  if (tag.startsWith('en')) return 'en'
  return null
}

export function isFrenchRegion(
  country: string | null | undefined,
  region: string | null | undefined,
): boolean {
  if (!country) return false
  const c = country.trim().toUpperCase()
  const r = (region ?? '').trim().toUpperCase()
  if (FRENCH_REGIONS[c]) return FRENCH_REGIONS[c].has(r)
  return FRENCH_COUNTRIES.has(c)
}

export function parseAcceptLanguage(
  header: string | null | undefined,
): Array<{ tag: string; quality: number }> {
  if (!header) return []
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
      const parsed = q ? Number.parseFloat(q.slice(2)) : 1
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(parsed) ? 1 : parsed }
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.quality - a.quality)
}

export function resolveLocale(input: {
  cookie?: string | null
  acceptLanguage?: string | null
  country?: string | null
  region?: string | null
}): Locale {
  const explicit = normalizeLocale(input.cookie)
  if (explicit) return explicit

  if (isFrenchRegion(input.country, input.region)) return 'fr'

  for (const { tag } of parseAcceptLanguage(input.acceptLanguage)) {
    const match = normalizeLocale(tag)
    if (match) return match
  }
  return DEFAULT_LOCALE
}
