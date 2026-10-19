/**
 * Client-side "is this really a cat?" check.
 *
 * Runs MobileNet v2 (an ImageNet image classifier) entirely in the browser via
 * TensorFlow.js — no API keys, no server cost, and the photo never leaves the
 * device for the check.
 *
 * Two things are deliberately true about this check:
 *
 * 1. It is **advisory**. MobileNet can only ever output 1000 fixed ImageNet
 *    labels, and only five of them are domestic cats, so any other breed may be
 *    classified as something else. The result is shown as a hint and never
 *    blocks a submission — the server enforces the real limits separately.
 * 2. It matches on the exact label. The previous loose pattern accepted non-cats
 *    ("sea lion" matched \blion\b, "tiger shark" matched \btiger\b, "Madagascar
 *    cat" and "lesser panda … bear cat" matched \bcat\b).
 */

export type Prediction = { className: string; probability: number }

export type CatCheckResult =
  | { status: 'ok'; confidence: number; predictions: Prediction[] }
  | { status: 'not-cat'; confidence: number; predictions: Prediction[] }
  | { status: 'error'; predictions?: Prediction[] }

/** The two verdicts the classifier itself can reach (never `error`). */
type Judgement =
  | { status: 'ok'; confidence: number; predictions: Prediction[] }
  | { status: 'not-cat'; confidence: number; predictions: Prediction[] }

/**
 * Primary names (the text before the first comma) of every ImageNet class that
 * is genuinely a cat.
 *
 * The five domestic ones are all MobileNet can emit for a house cat; the wild
 * felids are included because a house cat is frequently mistaken for a lynx or
 * a cougar, and missing a real cat is worse than letting an odd photo through.
 */
const FELINE_LABELS = new Set([
  'tabby',
  'tiger cat',
  'persian cat',
  'siamese cat',
  'egyptian cat',
  'cougar',
  'lynx',
  'leopard',
  'snow leopard',
  'jaguar',
  'lion',
  'tiger',
  'cheetah',
])

const TOP_K = 5
/** A feline anywhere in the top predictions counts — recall over precision. */
const FELINE_IN_TOP = TOP_K
/**
 * …but it still has to be a plausible guess. Between TF.js backends the tail of
 * the distribution shuffles by a point or two, and a rank-5 "lynx 2%" is noise.
 * A real photo of a cat puts its cat label far above this.
 */
const MIN_FELINE_CONFIDENCE = 0.12

/** Never let a slow or hanging model block the form. */
const TIMEOUT_MS = 20_000

type MobilenetModel = {
  classify: (
    input: HTMLImageElement | HTMLCanvasElement,
    topk?: number,
  ) => Promise<Prediction[]>
}

let modelPromise: Promise<MobilenetModel> | null = null

async function getModel(): Promise<MobilenetModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const [tf, mobilenet] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/mobilenet'),
      ])
      await tf.ready()
      return mobilenet.load({ version: 2, alpha: 1.0 }) as Promise<MobilenetModel>
    })().catch((error) => {
      modelPromise = null
      throw error
    })
  }
  return modelPromise
}

function primaryLabel(className: string): string {
  return className.split(',')[0]?.trim().toLowerCase() ?? ''
}

function isFeline(className: string): boolean {
  return FELINE_LABELS.has(primaryLabel(className))
}

function judge(predictions: Prediction[]): Judgement {
  const feline = predictions
    .slice(0, FELINE_IN_TOP)
    .find((p) => isFeline(p.className) && p.probability >= MIN_FELINE_CONFIDENCE)
  return feline
    ? { status: 'ok', confidence: feline.probability, predictions }
    : {
        status: 'not-cat',
        confidence: predictions[0]?.probability ?? 0,
        predictions,
      }
}

/** Centre square crop, so an off-centre cat in a wide photo is not lost. */
function centreSquare(img: HTMLImageElement): HTMLCanvasElement | null {
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  if (!side || side === Math.max(img.naturalWidth, img.naturalHeight)) {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = side
  canvas.height = side
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(
    img,
    (img.naturalWidth - side) / 2,
    (img.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    side,
    side,
  )
  return canvas
}

/** Union of two prediction lists by label, keeping the stronger probability. */
function mergePredictions(
  a: Prediction[],
  b: Prediction[],
): Prediction[] {
  const best = new Map<string, Prediction>()
  for (const p of [...a, ...b]) {
    const existing = best.get(p.className)
    if (!existing || p.probability > existing.probability) best.set(p.className, p)
  }
  return [...best.values()]
    .sort((x, y) => y.probability - x.probability)
    .slice(0, TOP_K)
}

async function classifyFile(file: File): Promise<CatCheckResult> {
  const model = await getModel()
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()

    const first = await model.classify(img, TOP_K)
    const firstVerdict = judge(first)
    if (firstVerdict.status === 'ok') return firstVerdict

    // Second opinion on a centre square: cheap, and rescues photos where the
    // cat is not centred. MobileNet centre-crops internally, so a wide photo
    // can otherwise lose the subject before it is ever classified.
    const square = centreSquare(img)
    if (square) {
      const second = await model.classify(square, TOP_K)
      const secondVerdict = judge(second)
      if (secondVerdict.status === 'ok') return secondVerdict
      return {
        status: 'not-cat',
        confidence: Math.max(firstVerdict.confidence, secondVerdict.confidence),
        predictions: mergePredictions(first, second),
      }
    }

    return firstVerdict
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function checkIsCat(file: File): Promise<CatCheckResult> {
  if (typeof window === 'undefined') return { status: 'error' }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<CatCheckResult>((resolve) => {
      timer = setTimeout(() => resolve({ status: 'error' }), TIMEOUT_MS)
    })
    return await Promise.race([classifyFile(file), timeout])
  } catch {
    return { status: 'error' }
  } finally {
    if (timer) clearTimeout(timer)
  }
}
