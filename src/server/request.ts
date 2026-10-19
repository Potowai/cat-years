import { getRequestHeaders } from '@tanstack/react-start/server'
import { hashToken } from '~/lib/tokens'

let warnedAboutSalt = false

/**
 * Salt used to hash visitor IPs. A predictable salt makes stored hashes
 * reversible by brute-forcing the IPv4 space, so we nag in production when the
 * documented variable was never set.
 */
function salt(): string {
  const configured = process.env.IP_SALT
  if (configured) return configured
  if (process.env.NODE_ENV === 'production' && !warnedAboutSalt) {
    warnedAboutSalt = true
    console.warn(
      '[cat-years] IP_SALT is not set — stored IP hashes are trivially ' +
        'reversible. Set IP_SALT in production (see .env.example).',
    )
  }
  return 'cat-years'
}

/**
 * Hashes the caller's address so rate limiting can group requests without ever
 * storing a raw IP.
 *
 * On Vercel `x-forwarded-for` is overwritten by the platform and cannot be
 * spoofed (see the Vercel request-headers docs), so the left-most entry is
 * trustworthy there. Behind a different proxy, only trust it if that proxy
 * overwrites the header too.
 */
export async function ipHashFromHeaders(headers: Headers): Promise<string> {
  const forwarded = headers.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
  return hashToken(`${salt()}:${ip}`)
}

/** Same thing, for server functions where the request is implicit. */
export function ipHashFromRequest(): Promise<string> {
  return ipHashFromHeaders(getRequestHeaders() as Headers)
}
