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

/**
 * Length-independent, constant-time string comparison. Used to compare secret
 * hashes so a caller cannot learn a token byte-by-byte from response timing.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
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

// --- Owner-wide identity -------------------------------------------------
// One secret per browser (and one optional pseudo) so a single link unlocks
// every cat that owner added, on any device.

const OWNER_KEY = 'cat-years:owner'
const OWNER_NAME_KEY = 'cat-years:owner-name'

export function getOwnerToken(): string {
  if (typeof localStorage === 'undefined') return ''
  let token = localStorage.getItem(OWNER_KEY)
  if (!token) {
    token = createToken()
    localStorage.setItem(OWNER_KEY, token)
  }
  return token
}

/** The stored owner token, or null. Unlike `getOwnerToken`, never creates one. */
export function peekOwnerToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(OWNER_KEY)
}

export function setOwnerToken(token: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(OWNER_KEY, token)
}

export function getOwnerName(): string {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(OWNER_NAME_KEY) ?? ''
}

export function rememberOwnerName(name: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(OWNER_NAME_KEY, name)
}

/** Ids of the cats this browser has a per-cat token for (all ages). */
export function listOwnedIds(): string[] {
  return Object.keys(readOwned())
}

/** Forget every per-cat token, e.g. after they were all claimed by an owner. */
export function forgetAllOwnership(): void {
  writeOwned({})
}
