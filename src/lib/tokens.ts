const OWNED_KEY = 'cat-years:owned'

export function createToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')
}

function readOwned(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(OWNED_KEY) ?? '{}') as Record<
      string,
      string
    >
  } catch {
    return {}
  }
}

function writeOwned(map: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(OWNED_KEY, JSON.stringify(map))
}

export function rememberOwnership(catId: string, token: string): void {
  const map = readOwned()
  map[catId] = token
  writeOwned(map)
}

export function forgetOwnership(catId: string): void {
  const map = readOwned()
  delete map[catId]
  writeOwned(map)
}

export function getOwnership(catId: string): string | null {
  return readOwned()[catId] ?? null
}

export function isOwner(catId: string): boolean {
  return getOwnership(catId) !== null
}
