/**
 * Guess a cat's coat from the photo itself.
 *
 * The ImageNet classifier only knows *breeds* ("Persian cat", "tabby"), and a
 * Persian can be white, grey or ginger — so breed labels are useless for
 * colours. What actually distinguishes "orange, white & black" from "grey &
 * white" is the fur itself, so this reads the pixels.
 *
 * The centre `CROP` of the photo is scaled down and every pixel is sorted into a
 * fur bucket. Anything that is not a plausible fur colour — green foliage, blue
 * sky, a pink collar — is thrown away, which does most of the background
 * removal for free. The surviving buckets are normalised into shares and mapped
 * onto the coat picker.
 *
 * Like the cat check this is only a suggestion: the owner can always change it.
 */

import type { Prediction } from './catCheck'
import type { CoatId } from './types'

export type CoatGuess = { coat: CoatId; confidence: number }

/** Sample size; large enough to be stable, small enough to be instant. */
const SAMPLE = 48
/** Centre square taken from the photo, where the cat usually is. */
const CROP = 0.72
/** Below this share of fur-coloured pixels we have not really seen a cat. */
const MIN_FUR_COVERAGE = 0.25
/** Width of the frame edge used to estimate the background, as a share. */
const BORDER_FRACTION = 0.15
/**
 * One colour must own at least this much of the frame edge before the edge is
 * accepted as a backdrop worth subtracting.
 */
const UNIFORM_EDGE = 0.5
/**
 * How much of the middle must survive background removal for the subtraction to
 * be believed. Below it the ring and the middle look alike — the cat fills the
 * frame, or the background does.
 */
const BACKGROUND_REMOVAL_MIN = 0.35
/**
 * Without a subtraction, one colour must own this much of the middle. The bar
 * differs per colour: grey and cream are also what asphalt, concrete, sand and
 * overcast sky look like, while nothing much that is orange is a backdrop.
 */
const FALLBACK_FLOOR: Shares = {
  orange: 0.5,
  brown: 0.55,
  black: 0.6,
  white: 0.72,
  grey: 0.8,
  cream: 0.8,
}
/** …or a combination may be this confident instead of one dominant colour. */
const FALLBACK_COMBO = 0.85
/** Minimum share for the strongest solid colour to be trusted on its own. */
const SOLID_SHARE = 0.58
/** Minimum confidence for a combination to be worth pre-selecting. */
const MIN_CONFIDENCE = 0.5

export type Fur = 'white' | 'black' | 'grey' | 'orange' | 'cream' | 'brown'

const FUR_KEYS: readonly Fur[] = [
  'white',
  'black',
  'grey',
  'orange',
  'cream',
  'brown',
]

type Shares = Record<Fur, number>

function emptyShares(): Shares {
  return { white: 0, black: 0, grey: 0, orange: 0, cream: 0, brown: 0 }
}

function normalise(counts: Shares, total: number): Shares | null {
  if (total <= 0) return null
  const out = emptyShares()
  for (const key of FUR_KEYS) out[key] = counts[key] / total
  return out
}

/** Largest share any single bucket holds. */
function maxShare(counts: Shares, total: number): number {
  if (total <= 0) return 0
  return Math.max(...FUR_KEYS.map((key) => counts[key] / total))
}

function hueSatVal(r: number, g: number, b: number) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

/** Sort one pixel into a fur bucket, or `null` if it cannot be fur. */
export function bucketOf(r: number, g: number, b: number): Fur | null {
  const { h, s, v } = hueSatVal(r, g, b)

  // Near-neutral: white, black or grey. Blue-leaning light is sky or shade,
  // not fur — that single test removes most skies. The black threshold is
  // generous because black fur photographs well above pure black.
  if (s <= 0.2) {
    if (b - r > 0.09) return null
    if (v >= 0.78) return 'white'
    if (v <= 0.33) return 'black'
    return 'grey'
  }

  // Warm hues are the only ones a cat wears (ginger, cream, tabby brown).
  if (h >= 8 && h <= 62) {
    if (s >= 0.55 && v >= 0.52) return 'orange'
    if (v >= 0.72) return 'cream'
    return 'brown'
  }

  // Greens, blues, pinks…: background, clothing, collars. Ignore.
  return null
}

export type FurRead = {
  /** Share of the fur-coloured pixels, per bucket. Sums to 1. */
  shares: Shares
  /** Share of *all* sampled pixels that looked like fur at all. */
  coverage: number
}

/**
 * Classify an RGBA buffer (the drawn canvas) into fur shares.
 *
 * The centre of a photo is rarely all cat, so the frame edge is treated as a
 * sample of the backdrop and what the middle has in common with it is
 * subtracted out. That is what turns a black cat on grey rocks into "black"
 * rather than "black & white".
 *
 * Kept free of the canvas so it can be exercised outside a browser. Returns
 * `null` when the crop cannot be read.
 */
export function readFur(data: Uint8ClampedArray): FurRead | null {
  const side = Math.round(Math.sqrt(data.length / 4))
  if (side < 4 || side * side * 4 !== data.length) return null
  const ring = Math.max(2, Math.round(side * BORDER_FRACTION))

  const borderCounts = emptyShares()
  const innerCounts = emptyShares()
  let borderFur = 0
  let innerFur = 0
  let totalFur = 0

  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const p = (y * side + x) * 4
      const fur =
        data[p + 3] < 200
          ? null
          : bucketOf(data[p] / 255, data[p + 1] / 255, data[p + 2] / 255)
      if (!fur) continue
      totalFur += 1
      const onBorder =
        x < ring || y < ring || x >= side - ring || y >= side - ring
      if (onBorder) {
        borderCounts[fur] += 1
        borderFur += 1
      } else {
        innerCounts[fur] += 1
        innerFur += 1
      }
    }
  }

  const coverage = totalFur / (side * side)
  if (coverage < MIN_FUR_COVERAGE || innerFur === 0) return null

  // What the backdrop is expected to contribute to the middle, from the edge.
  const adjusted = emptyShares()
  let adjustedTotal = 0
  const edgeTop = borderFur > 0 ? maxShare(borderCounts, borderFur) : 0
  for (const key of FUR_KEYS) {
    const expected = borderFur > 0 ? (borderCounts[key] / borderFur) * innerFur : 0
    const left = Math.max(0, innerCounts[key] - expected)
    adjusted[key] = left
    adjustedTotal += left
  }

  // Subtraction is only meaningful when the edge really looks like a backdrop
  // (one colour owns it) and enough of the middle survives it.
  if (edgeTop >= UNIFORM_EDGE && adjustedTotal >= BACKGROUND_REMOVAL_MIN * innerFur) {
    const shares = normalise(adjusted, adjustedTotal)
    return shares ? { shares, coverage } : null
  }

  // Edge and middle look alike: either the cat fills the frame or the backdrop
  // does. Only speak up on strong evidence.
  const raw = normalise(innerCounts, innerFur)
  if (!raw) return null
  const top = FUR_KEYS.reduce((a, b) => (raw[b] > raw[a] ? b : a))
  if (raw[top] >= FALLBACK_FLOOR[top]) return { shares: raw, coverage }

  const combo = coatFromShares(raw)
  const neutral = combo?.coat === 'grey' || combo?.coat === 'cream'
  if (combo && !neutral && combo.confidence >= FALLBACK_COMBO) {
    return { shares: raw, coverage }
  }
  return null
}

/** Fur shares for an RGBA buffer, mapped onto the coat picker. */
export function coatFromPixels(
  data: Uint8ClampedArray,
  hint = false,
): CoatGuess | null {
  const read = readFur(data)
  return read ? coatFromShares(read.shares, hint) : null
}

/**
 * MobileNet's cat labels are breeds, but "tabby" and "tiger cat" do describe a
 * pattern, so they are allowed to nudge a brown-dominant photo towards tabby.
 */
function tabbyHint(predictions: Prediction[]): boolean {
  return predictions.some((p) => {
    const label = p.className.split(',')[0]?.trim().toLowerCase() ?? ''
    return (
      (label === 'tabby' || label === 'tiger cat' || label === 'egyptian cat') &&
      p.probability >= 0.15
    )
  })
}

/**
 * Map colour shares onto a coat. Pure and exported so the thresholds can be
 * exercised without a browser.
 */
export function coatFromShares(
  shares: Shares,
  hint = false,
): CoatGuess | null {
  const { white, black, grey, orange, cream, brown } = shares
  const guess = (coat: CoatId, confidence: number): CoatGuess | null =>
    confidence >= MIN_CONFIDENCE ? { coat, confidence } : null

  const tabbyish = brown >= 0.4 || (brown >= 0.22 && hint)

  // Solid coats: one colour owns the fur.
  const solids: [CoatId, number][] = [
    ['white', white],
    ['black', black],
    ['orange', orange],
    ['grey', grey],
    ['cream', cream],
  ]
  for (const [coat, share] of solids) {
    if (share >= 0.66) return { coat, confidence: share }
  }
  if (tabbyish && white < 0.2 && brown >= 0.5) {
    return { coat: 'tabby', confidence: brown }
  }

  // Combinations: white is the tell-tale second colour, so it leads.
  if (white >= 0.2) {
    if (black >= 0.2 && orange >= 0.1) {
      return guess('calico', white + black + orange)
    }
    if (black >= 0.2) return guess('tuxedo', white + black)
    if (orange >= 0.2) return guess('orange-white', white + orange)
    if (grey >= 0.2) return guess('grey-white', white + grey)
    if (tabbyish && brown >= 0.2) return guess('tabby-white', white + brown)
  }

  // Tortoiseshell: orange and black mottled together with (almost) no white.
  if (orange >= 0.25 && black >= 0.2 && white < 0.15) {
    return guess('tortoiseshell', orange + black)
  }

  // Nothing conclusive; only pre-select on a clear leader.
  const strongest = [...solids, ['tabby', brown] as [CoatId, number]].reduce(
    (a, b) => (b[1] > a[1] ? b : a),
  )
  if (strongest[1] >= SOLID_SHARE) {
    return { coat: strongest[0], confidence: strongest[1] }
  }
  return null
}

/** Draw the centre of the photo into a small square and read its pixels. */
function sampleCanvas(img: HTMLImageElement): Uint8ClampedArray | null {
  const w = img.naturalWidth
  const h = img.naturalHeight
  const side = Math.round(Math.min(w, h) * CROP)
  if (!side) return null

  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE
  canvas.height = SAMPLE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.drawImage(
    img,
    Math.round((w - side) / 2),
    Math.round((h - side) / 2),
    side,
    side,
    0,
    0,
    SAMPLE,
    SAMPLE,
  )

  return ctx.getImageData(0, 0, SAMPLE, SAMPLE).data
}

/**
 * Suggest a coat for a photo, or `null` when the colours are inconclusive.
 * Never throws: a failed guess simply leaves the picker untouched.
 */
export async function inferCoat(
  file: File,
  predictions: Prediction[] = [],
): Promise<CoatGuess | null> {
  if (typeof document === 'undefined') return null

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()

    const data = sampleCanvas(img)
    if (!data) return null
    return coatFromPixels(data, tabbyHint(predictions))
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
