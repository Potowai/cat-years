export type StageId =
  | 'kitten'
  | 'junior'
  | 'adult'
  | 'mature'
  | 'senior'
  | 'geriatric'

/** Locale-independent presentation for a life stage (colour + emoji). */
export const STAGE_META: Record<StageId, { accent: string; emoji: string }> = {
  kitten: { accent: 'tangerine', emoji: '🍼' },
  junior: { accent: 'butter', emoji: '⚡' },
  adult: { accent: 'sage', emoji: '😼' },
  mature: { accent: 'sky', emoji: '🛋️' },
  senior: { accent: 'plum', emoji: '👑' },
  geriatric: { accent: 'blush', emoji: '🏆' },
}

export type CatAge = {
  totalDays: number
  totalMonths: number
  catYears: number
  years: number
  months: number
  humanYears: number
  stageId: StageId
}

export function parseBirthdate(birthdate: string): Date {
  const [y, m, d] = birthdate.split('-').map((n) => Number.parseInt(n, 10))
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1))
}

export function humanYearsForMonths(totalMonths: number): number {
  const cy = totalMonths / 12
  if (cy <= 1) return cy * 15
  if (cy <= 2) return 15 + (cy - 1) * 9
  return 24 + (cy - 2) * 4
}

export function stageForMonths(totalMonths: number): StageId {
  if (totalMonths < 7) return 'kitten'
  if (totalMonths < 25) return 'junior'
  if (totalMonths < 84) return 'adult'
  if (totalMonths < 120) return 'mature'
  if (totalMonths < 180) return 'senior'
  return 'geriatric'
}

export function computeCatAge(
  birthdate: string,
  now: Date = new Date(),
): CatAge {
  const birth = parseBirthdate(birthdate)
  let totalMonths =
    (now.getUTCFullYear() - birth.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - birth.getUTCMonth())
  if (now.getUTCDate() < birth.getUTCDate()) totalMonths -= 1
  if (totalMonths < 0) totalMonths = 0

  const totalDays = Math.max(
    0,
    Math.floor((now.getTime() - birth.getTime()) / 86_400_000),
  )

  return {
    totalDays,
    totalMonths,
    catYears: totalMonths / 12,
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    humanYears: humanYearsForMonths(totalMonths),
    stageId: stageForMonths(totalMonths),
  }
}

const VERDICT_THRESHOLDS = [5, 12, 18, 30, 40, 55, 70, 100, Infinity]

/** Index into the localized verdict list for a given human age. */
export function verdictTier(humanYears: number): number {
  const index = VERDICT_THRESHOLDS.findIndex((upTo) => humanYears <= upTo)
  return index === -1 ? VERDICT_THRESHOLDS.length - 1 : index
}

/** Average dry-food (kibble) appetite per day, by life stage. */
export const KIBBLE_GRAMS_PER_DAY: Record<StageId, number> = {
  kitten: 40,
  junior: 70,
  adult: 160,
  mature: 145,
  senior: 130,
  geriatric: 120,
}

/** Daily kibble appetite in grams for a cat's current stage. */
export function kibbleGramsPerDay(age: CatAge): number {
  return KIBBLE_GRAMS_PER_DAY[age.stageId]
}

/** Life stages with their age windows in months (upper bound exclusive). */
export const STAGE_RANGES: Array<{
  id: StageId
  fromMonths: number
  toMonths: number | null
}> = [
  { id: 'kitten', fromMonths: 0, toMonths: 7 },
  { id: 'junior', fromMonths: 7, toMonths: 25 },
  { id: 'adult', fromMonths: 25, toMonths: 84 },
  { id: 'mature', fromMonths: 84, toMonths: 120 },
  { id: 'senior', fromMonths: 120, toMonths: 180 },
  { id: 'geriatric', fromMonths: 180, toMonths: null },
]

/**
 * Official LOOF « Une année, une lettre » table (source: loof.asso.fr).
 *
 * One letter per year, but a few years offer several letters (P or Q, V to Z,
 * J or K) because some initials are too rare to fill. That consumes all 26
 * letters over a 20-year cycle, so 2015 = L and 2035 = L again.
 */
const YEAR_LETTERS: readonly string[][] = [
  ['L'], // 2015
  ['M'], // 2016
  ['N'], // 2017
  ['O'], // 2018
  ['P', 'Q'], // 2019
  ['R'], // 2020
  ['S'], // 2021
  ['T'], // 2022
  ['U'], // 2023
  ['V', 'W', 'X', 'Y', 'Z'], // 2024
  ['A'], // 2025
  ['B'], // 2026
  ['C'], // 2027
  ['D'], // 2028
  ['E'], // 2029
  ['F'], // 2030
  ['G'], // 2031
  ['H'], // 2032
  ['I'], // 2033
  ['J', 'K'], // 2034
]

export const LETTER_CYCLE_START = 2015
export const LETTER_CYCLE_LENGTH = YEAR_LETTERS.length

/** The letter(s) of the cat year, e.g. ['B'] for 2026, ['V','W','X','Y','Z'] for 2024. */
export function catYearLetters(year: number): string[] {
  const index =
    (((year - LETTER_CYCLE_START) % LETTER_CYCLE_LENGTH) +
      LETTER_CYCLE_LENGTH) %
    LETTER_CYCLE_LENGTH
  return YEAR_LETTERS[index]
}

/** All 26 letters, in order, for the legend. */
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function factValues(age: CatAge) {
  const napHours = Math.round(age.totalDays * 16)
  const naps = Math.round(napHours / 3)
  const heartbeats = age.totalDays * 24 * 60 * 130
  const kibbleGrams =
    age.totalDays * KIBBLE_GRAMS_PER_DAY[age.stageId]
  return { days: age.totalDays, napHours, naps, heartbeats, kibbleGrams }
}
