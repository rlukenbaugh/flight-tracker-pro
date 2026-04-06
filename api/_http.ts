type QueryValue = string | string[] | undefined

type HandlerRequest = {
  method?: string
  query?: Record<string, QueryValue>
  headers?: Record<string, string | string[] | undefined>
  body?: unknown
}

type HandlerResponse = {
  status: (code: number) => HandlerResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

type RateLimitEntry = {
  count: number
  resetAt: number
}

type CacheEntry = {
  expiresAt: number
  value: unknown
}

declare global {
  var __flightTrackerRateLimitStore: Map<string, RateLimitEntry> | undefined
  var __flightTrackerCacheStore: Map<string, CacheEntry> | undefined
}

function rateLimitStore() {
  if (!globalThis.__flightTrackerRateLimitStore) {
    globalThis.__flightTrackerRateLimitStore = new Map<string, RateLimitEntry>()
  }

  return globalThis.__flightTrackerRateLimitStore
}

function cacheStore() {
  if (!globalThis.__flightTrackerCacheStore) {
    globalThis.__flightTrackerCacheStore = new Map<string, CacheEntry>()
  }

  return globalThis.__flightTrackerCacheStore
}

export function readSingle(value: QueryValue, fallback = '') {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback
}

export function json(res: HandlerResponse, status: number, body: unknown) {
  res.status(status).json(body)
}

export function setCommonHeaders(res: HandlerResponse, cacheControl: string) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', cacheControl)
}

export function getDeploymentEnvironment() {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development'
}

export function logServerEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  context: Record<string, unknown>,
) {
  const payload = JSON.stringify({
    level,
    event,
    environment: getDeploymentEnvironment(),
    service: 'flight-tracker-pro-api',
    timestamp: new Date().toISOString(),
    ...context,
  })

  if (level === 'error') {
    console.error(payload)
    return
  }

  if (level === 'warn') {
    console.warn(payload)
    return
  }

  console.log(payload)
}

function getClientIp(req: HandlerRequest) {
  const forwardedFor = readSingle(req.headers?.['x-forwarded-for'])
  const realIp = readSingle(req.headers?.['x-real-ip'])
  return forwardedFor.split(',')[0]?.trim() || realIp || 'unknown'
}

export function enforceRateLimit(
  req: HandlerRequest,
  res: HandlerResponse,
  options: {
    scope: string
    limit: number
    windowMs: number
  },
) {
  const store = rateLimitStore()
  const ip = getClientIp(req)
  const key = `${options.scope}:${ip}`
  const now = Date.now()
  const current = store.get(key)

  const nextEntry =
    !current || current.resetAt <= now
      ? { count: 1, resetAt: now + options.windowMs }
      : { count: current.count + 1, resetAt: current.resetAt }

  store.set(key, nextEntry)

  res.setHeader('X-RateLimit-Limit', String(options.limit))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.limit - nextEntry.count)))
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(nextEntry.resetAt / 1000)))

  if (nextEntry.count > options.limit) {
    logServerEvent('warn', 'api.rate_limited', {
      scope: options.scope,
      ip,
    })
    json(res, 429, {
      error: 'Rate limit exceeded. Please wait a moment and try again.',
    })
    return false
  }

  return true
}

export async function withMemoryCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
) {
  const store = cacheStore()
  const existing = store.get(key)
  const now = Date.now()

  if (existing && existing.expiresAt > now) {
    return existing.value as T
  }

  const nextValue = await loader()
  store.set(key, {
    expiresAt: now + ttlMs,
    value: nextValue,
  })
  return nextValue
}

export function validateIataCode(value: string, field: string) {
  if (!/^[A-Z]{3}$/.test(value)) {
    throw new Error(`${field} must be a valid 3-letter IATA code.`)
  }
}

export function validateDate(value: string, field: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be a valid ISO date.`)
  }
}

export function validateTravelerCount(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 9) {
    throw new Error('Travelers must be an integer between 1 and 9.')
  }
}

export function validateTripType(value: string) {
  if (value !== 'round-trip' && value !== 'one-way') {
    throw new Error('Trip type must be round-trip or one-way.')
  }
}

export type { HandlerRequest, HandlerResponse }
