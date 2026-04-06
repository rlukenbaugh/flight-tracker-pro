import { buildApiUrl } from './runtimeConfig'

type TelemetryLevel = 'info' | 'warn' | 'error'

interface TelemetryPayload {
  event: string
  level?: TelemetryLevel
  context?: Record<string, unknown>
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown client error',
  }
}

export function trackEvent(payload: TelemetryPayload) {
  if (typeof window === 'undefined') {
    return
  }

  const body = JSON.stringify({
    event: payload.event,
    level: payload.level ?? 'info',
    context: payload.context ?? {},
    timestamp: new Date().toISOString(),
    pathname: window.location.pathname,
  })

  const url = buildApiUrl('/api/telemetry')

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body)
    return
  }

  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Avoid surfacing telemetry failures to travelers.
  })
}

export function trackError(event: string, error: unknown, context?: Record<string, unknown>) {
  trackEvent({
    event,
    level: 'error',
    context: {
      ...context,
      error: normalizeError(error),
    },
  })
}
