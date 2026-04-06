import {
  json,
  logServerEvent,
  setCommonHeaders,
  type HandlerRequest,
  type HandlerResponse,
} from './_http.js'
import { loadUserState, requireAuthenticatedUser, saveUserState } from './_database.js'
import type { AlertPreference, SavedFlight, SearchState } from '../src/types.js'

type HandlerBody = {
  savedFlights?: unknown
  alertPreference?: unknown
  savedSearch?: unknown
}

function parseBody(body: unknown): HandlerBody {
  if (!body) {
    return {}
  }

  if (typeof body === 'string') {
    return JSON.parse(body) as HandlerBody
  }

  return body as HandlerBody
}

function normalizePayload(body: HandlerBody): {
  savedFlights?: SavedFlight[]
  alertPreference?: AlertPreference
  savedSearch?: SearchState
} {
  return {
    savedFlights: Array.isArray(body.savedFlights) ? (body.savedFlights as SavedFlight[]) : undefined,
    alertPreference:
      body.alertPreference && typeof body.alertPreference === 'object'
        ? (body.alertPreference as AlertPreference)
        : undefined,
    savedSearch:
      body.savedSearch && typeof body.savedSearch === 'object'
        ? (body.savedSearch as SearchState)
        : undefined,
  }
}

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  setCommonHeaders(res, 'no-store')

  if (req.method !== 'GET' && req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const user = await requireAuthenticatedUser(req)
    if (!user) {
      json(res, 401, { error: 'Authentication required.' })
      return
    }

    if (req.method === 'GET') {
      const payload = await loadUserState(user.id)
      json(res, 200, payload ?? { savedFlights: [] })
      return
    }

    const body = parseBody((req as HandlerRequest & { body?: unknown }).body)
    await saveUserState(user.id, normalizePayload(body))
    json(res, 200, { ok: true })
  } catch (error) {
    logServerEvent('error', 'user_state.failure', {
      message: error instanceof Error ? error.message : 'Unexpected user-state failure.',
    })
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Unexpected user-state failure.',
    })
  }
}
