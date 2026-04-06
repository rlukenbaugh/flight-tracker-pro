import {
  enforceRateLimit,
  json,
  logServerEvent,
  setCommonHeaders,
  type HandlerRequest,
  type HandlerResponse,
} from './_http.js'
import { recordUsageEvent } from './_database.js'

type TelemetryBody = {
  event?: string
  level?: 'info' | 'warn' | 'error'
  pathname?: string
  timestamp?: string
  context?: Record<string, unknown>
}

function parseBody(body: unknown) {
  if (!body) {
    return {}
  }

  if (typeof body === 'string') {
    return JSON.parse(body) as TelemetryBody
  }

  return body as TelemetryBody
}

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  setCommonHeaders(res, 'no-store')

  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  if (!enforceRateLimit(req, res, { scope: 'telemetry', limit: 60, windowMs: 60_000 })) {
    return
  }

  try {
    const body = parseBody((req as HandlerRequest & { body?: unknown }).body)
    const event = body.event ?? 'client.event'
    const level = body.level ?? 'info'

    logServerEvent(level, event, {
      pathname: body.pathname ?? null,
      clientTimestamp: body.timestamp ?? null,
      context: body.context ?? {},
    })

    await recordUsageEvent({
      eventType: event,
      level,
      pathname: body.pathname,
      context: (body.context ?? null) as Parameters<typeof recordUsageEvent>[0]['context'],
    }).catch(() => {
      // Structured console logs are the fallback telemetry sink.
    })

    json(res, 202, { accepted: true })
  } catch (error) {
    logServerEvent('error', 'telemetry.failure', {
      message: error instanceof Error ? error.message : 'Unexpected telemetry failure.',
    })
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Unexpected telemetry failure.',
    })
  }
}
