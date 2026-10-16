import { ERR, type ErrorCode } from './errors'

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const MAX_DIMENSION = 1600

export function validateImage(file: File): ErrorCode | null {
  if (!file.type.startsWith('image/')) return ERR.NOT_IMAGE
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return ERR.BAD_TYPE
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return ERR.TOO_BIG
  }
  return null
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file)
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  await img.decode()
  URL.revokeObjectURL(url)
  return img
}

/**
 * Downscales and re-encodes an image in the browser so uploads stay small and
 * fast. Falls back to the original file when anything is unsupported.
 */
export async function prepareImage(file: File): Promise<File> {
  try {
    const bitmap = await loadBitmap(file)
    const width = bitmap.width
    const height = bitmap.height
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height))
    const targetW = Math.round(width * scale)
    const targetH = Math.round(height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetW, targetH)

    const outType = 'image/webp'
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, 0.85),
    )
    if (!blob) return file
    if (blob.size >= file.size && scale === 1) return file

    const name = file.name.replace(/\.[^.]+$/, '') || 'cat'
    return new File([blob], `${name}.webp`, { type: outType })
  } catch {
    return file
  }
}
