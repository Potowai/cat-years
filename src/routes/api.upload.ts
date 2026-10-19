import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createFileRoute } from '@tanstack/react-router'
import {
  recordPhotoUpload,
  uploadQuotaExceeded,
} from '~/db/cats.server'
import { ERR } from '~/lib/errors'
import { ipHashFromHeaders } from '~/server/request'

const MAX_BYTES = 4 * 1024 * 1024
/** Multipart framing on top of the file itself. */
const MAX_BODY_BYTES = MAX_BYTES + 512 * 1024
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function bad(error: string, status = 400) {
  return Response.json({ error }, { status })
}

/**
 * Confirms the bytes really are an image (magic-number sniffing), regardless of
 * what the browser claimed the content type is. Returns the true mime type.
 */
function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png'
  }
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return 'image/gif'
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ipHash = await ipHashFromHeaders(request.headers)

        // Reject over-large bodies before buffering them into memory.
        const declared = Number(request.headers.get('content-length') ?? '')
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
          return bad(ERR.TOO_BIG, 413)
        }

        // Uploads are anonymous, so cap them per caller like cat creation.
        if (await uploadQuotaExceeded(ipHash)) {
          return bad(ERR.RATE_LIMITED, 429)
        }

        let form: FormData
        try {
          form = await request.formData()
        } catch {
          return bad(ERR.BAD_UPLOAD)
        }

        const file = form.get('file')
        if (!(file instanceof File)) {
          return bad(ERR.NO_PHOTO)
        }
        if (file.size > MAX_BYTES) {
          return bad(ERR.TOO_BIG)
        }

        const bytes = new Uint8Array(await file.arrayBuffer())
        const type = sniffImageType(bytes)
        const ext = type ? ALLOWED[type] : undefined
        if (!type || !ext) {
          return bad(ERR.NOT_IMAGE)
        }

        const filename = `${randomUUID()}.${ext}`

        if (process.env.BLOB_READ_WRITE_TOKEN) {
          const { put } = await import('@vercel/blob')
          const blob = await put(
            `cats/${filename}`,
            new Blob([bytes], { type }),
            {
              access: 'public',
              contentType: type,
              addRandomSuffix: false,
            },
          )
          await recordPhotoUpload(blob.url, ipHash)
          return Response.json({ url: blob.url })
        }

        // Local development fallback: store in ./public/uploads
        try {
          const dir = join(process.cwd(), 'public', 'uploads')
          await mkdir(dir, { recursive: true })
          await writeFile(join(dir, filename), bytes)
          const url = `/uploads/${filename}`
          await recordPhotoUpload(url, ipHash)
          return Response.json({ url })
        } catch {
          return bad(ERR.STORAGE_UNCONFIGURED, 500)
        }
      },
    },
  },
})
