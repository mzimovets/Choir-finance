import { NextRequest } from 'next/server'

interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

// Clean up expired entries every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}, 10 * 60 * 1000)

/**
 * Returns a 429 Response if the IP has exceeded the limit, or null if allowed.
 * maxRequests per windowMs (default: 5 attempts per 15 minutes).
 */
export function checkRateLimit(
  req: NextRequest,
  { maxRequests = 5, windowMs = 15 * 60 * 1000 } = {}
): Response | null {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'

  const key = `${req.nextUrl.pathname}:${ip}`
  const now = Date.now()

  let bucket = store.get(key)
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs }
    store.set(key, bucket)
  }

  bucket.count++

  if (bucket.count > maxRequests) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return new Response(
      JSON.stringify({ error: 'Слишком много попыток. Попробуйте позже.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
        },
      }
    )
  }

  return null
}
