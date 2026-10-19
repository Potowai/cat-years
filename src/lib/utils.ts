import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40)
  return base || 'cat'
}

export function formatDate(iso: string, locale: string = 'en'): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function pluralize(n: number, one: string, many?: string): string {
  return n === 1 ? one : (many ?? `${one}s`)
}

/**
 * A unique id for client-side list keys. `crypto.randomUUID` only exists in a
 * secure context, so plain-http testing (a phone on the LAN) would otherwise
 * throw the moment a photo is picked.
 */
export function newId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = c.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, (b: number) => b.toString(16).padStart(2, '0')).join(
      '',
    )
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
