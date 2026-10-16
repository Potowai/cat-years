/**
 * Client-side "is this really a cat?" check.
 *
 * Runs MobileNet v2 (an ImageNet image classifier) entirely in the browser via
 * TensorFlow.js — no API keys, no server cost, and the photo never leaves the
 * device for the check. If none of the top predictions is a feline, the upload
 * is refused.
 *
 * This is a speed-bump for humans, not a defence against a determined attacker:
 * the server enforces the hard limits and image integrity separately.
 */

export type Prediction = { className: string; probability: number }

export type CatCheckResult =
  | { status: 'ok'; confidence: number; predictions: Prediction[] }
  | { status: 'not-cat'; confidence: number; predictions: Prediction[] }
  | { status: 'error'; predictions?: Prediction[] }

/** Feline class names in ImageNet (domestic cats, big cats and lynx). */
const FELINE_PATTERN =
  /\b(cat|kitten|kitty|tabby|siamese|persian|egyptian|lynx|cougar|puma|ocelot|leopard|jaguar|cheetah|lion|tiger)\b/i

const TOP_K = 5
/** A feline must appear among this many top predictions to pass. */
const FELINE_IN_TOP = 3

/** Never let a slow or hanging model block the form. */
const TIMEOUT_MS = 20_000

type MobilenetModel = {
  classify: (input: HTMLImageElement, topk?: number) => Promise<Prediction[]>
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

async function classifyFile(file: File): Promise<CatCheckResult> {
  const model = await getModel()
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const predictions = await model.classify(img, TOP_K)
    const feline = predictions
      .slice(0, FELINE_IN_TOP)
      .find((p) => FELINE_PATTERN.test(p.className))
    return feline
      ? { status: 'ok', confidence: feline.probability, predictions }
      : {
          status: 'not-cat',
          confidence: predictions[0]?.probability ?? 0,
          predictions,
        }
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
