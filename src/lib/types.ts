export type CatDTO = {
  id: string
  name: string
  slug: string
  /** ISO calendar date, e.g. "2021-04-09" */
  birthdate: string
  photoUrl: string
  bio: string | null
  coat: string | null
  purrs: number
  createdAt: string
}

export type CatSort = 'newest' | 'oldest' | 'senior' | 'popular' | 'name'

export const COAT_OPTIONS = [
  { id: 'orange', label: 'Ginger', hex: '#F2A24B' },
  { id: 'black', label: 'Black', hex: '#2B2A33' },
  { id: 'white', label: 'Snow', hex: '#F4F0E6' },
  { id: 'grey', label: 'Grey', hex: '#9AA0A6' },
  { id: 'tuxedo', label: 'Tuxedo', hex: '#3A3A44' },
  { id: 'calico', label: 'Calico', hex: '#D98A5B' },
  { id: 'tabby', label: 'Tabby', hex: '#B58A5E' },
  { id: 'cream', label: 'Cream', hex: '#E8D3B0' },
] as const

export type CoatId = (typeof COAT_OPTIONS)[number]['id']
