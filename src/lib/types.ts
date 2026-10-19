export const MAX_PHOTOS = 8

export type CatDTO = {
  id: string
  name: string
  slug: string
  /** ISO calendar date, e.g. "2021-04-09" */
  birthdate: string
  /** Cover photo — always the first entry of `photos`. */
  photoUrl: string
  /** All photos, in display order (at least one). */
  photos: string[]
  bio: string | null
  coat: string | null
  /** Public display name of the owner, if they set one. */
  ownerName: string | null
  purrs: number
  createdAt: string
}

export type CatSort = 'newest' | 'oldest' | 'senior' | 'popular' | 'name'

/**
 * What one visitor has left to spend on one cat in the current purr window.
 *
 * The detail page ships this with the cat so the button can stop on the tap
 * that exhausts the budget, instead of counting optimistically and only
 * finding out a round trip later.
 */
export type PurrBudget = {
  /** Purrs still allowed in the current window. */
  remaining: number
  /** Full size of a window (the per-visitor cap). */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
  /** When the open window ends (epoch ms), or null when none is open. */
  windowEndsAt: number | null
}

/**
 * The coat picker. Single colours first, then the combinations a cat can wear.
 *
 * `colors` is the swatch: one hex for a solid coat, two or three for a combo,
 * drawn as slices. IDs are stable — they are stored on existing rows, so
 * `tuxedo` and `calico` keep their identifiers even though the labels now spell
 * the colours out.
 */
export const COAT_OPTIONS = [
  { id: 'orange', colors: ['#F2A24B'] },
  { id: 'black', colors: ['#2B2A33'] },
  { id: 'white', colors: ['#F4F0E6'] },
  { id: 'grey', colors: ['#9AA0A6'] },
  { id: 'cream', colors: ['#E8D3B0'] },
  { id: 'tabby', colors: ['#B58A5E', '#7A5B3A'] },
  { id: 'tuxedo', colors: ['#2B2A33', '#F4F0E6'] },
  { id: 'orange-white', colors: ['#F2A24B', '#F4F0E6'] },
  { id: 'grey-white', colors: ['#9AA0A6', '#F4F0E6'] },
  { id: 'tabby-white', colors: ['#B58A5E', '#F4F0E6'] },
  { id: 'calico', colors: ['#F2A24B', '#F4F0E6', '#2B2A33'] },
  { id: 'tortoiseshell', colors: ['#2B2A33', '#C98A4B'] },
] as const

export type CoatId = (typeof COAT_OPTIONS)[number]['id']
