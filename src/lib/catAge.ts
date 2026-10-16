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
const KIBBLE_GRAMS_PER_DAY: Record<StageId, number> = {
  kitten: 40,
  junior: 70,
  adult: 160,
  mature: 145,
  senior: 130,
  geriatric: 120,
}

export function factValues(age: CatAge) {
  const napHours = Math.round(age.totalDays * 16)
  const naps = Math.round(napHours / 3)
  const heartbeats = age.totalDays * 24 * 60 * 130
  const kibbleGrams =
    age.totalDays * KIBBLE_GRAMS_PER_DAY[age.stageId]
  return { days: age.totalDays, napHours, naps, heartbeats, kibbleGrams }
}
