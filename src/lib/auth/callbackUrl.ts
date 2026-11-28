/** Where a learner lands after sign-in when the requested page is unusable. */
export const DEFAULT_CALLBACK_URL = '/'

export const LOGIN_PATH = '/auth/login'

/** Paths a sign-in must never send the learner back to. */
function isBlockedPath(pathname: string) {
  return (
    pathname === LOGIN_PATH ||
    pathname.startsWith(`${LOGIN_PATH}/`) ||
    pathname === '/api' ||
    pathname.startsWith('/api/')
  )
}

/**
 * The page to return to after sign-in, as a same-origin path (open-redirect
 * guard). Accepts a plain path (`/grammar?x=1`) or an absolute URL on `origin`
 * (Auth.js hands the proxy's redirect an absolute `callbackUrl`). Anything
 * else (another origin, a protocol-relative `//host`, a `/\host` that browsers
 * read as one, the login page itself, an API route, garbage) falls back to `/`.
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  origin?: string | null
): string {
  if (typeof raw !== 'string') return DEFAULT_CALLBACK_URL

  const value = raw.trim()

  if (!value) return DEFAULT_CALLBACK_URL

  const isPath = value.startsWith('/')

  // `//evil` and `/\evil` are protocol-relative: they leave the site.
  if (isPath && (value.startsWith('//') || value.startsWith('/\\')))
    return DEFAULT_CALLBACK_URL

  // Control characters (tabs, new lines) are stripped by browsers and can turn
  // a path into another origin.
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return DEFAULT_CALLBACK_URL

  let url: URL

  try {
    const base = new URL(origin || 'http://localhost')

    // A value that is not a path must be a full URL on this very origin.
    url = isPath ? new URL(value, base) : new URL(value)

    if (url.origin !== base.origin || (!isPath && !origin))
      return DEFAULT_CALLBACK_URL
  } catch {
    return DEFAULT_CALLBACK_URL
  }

  if (isBlockedPath(url.pathname)) return DEFAULT_CALLBACK_URL

  return `${url.pathname}${url.search}${url.hash}`
}

/** `/auth/login?callbackUrl=<path>` for a page the learner should return to. */
export function loginUrlFor(path: string) {
  const callbackUrl = safeCallbackUrl(path)

  if (callbackUrl === DEFAULT_CALLBACK_URL) return LOGIN_PATH

  return `${LOGIN_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`
}
