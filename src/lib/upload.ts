import { ERR } from './errors'
import { prepareImage } from './image'

export async function uploadPhoto(input: File): Promise<string> {
  const file = await prepareImage(input)
  const form = new FormData()
  form.append('file', file)

  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) {
    let code: string = ERR.UPLOAD_FAILED
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) code = body.error
    } catch {
      /* ignore */
    }
    throw new Error(code)
  }
  const data = (await res.json()) as { url: string }
  return data.url
}
