import { fetchDuffelJson, type DuffelPlaceSuggestion } from './_duffel.js'
import {
  enforceRateLimit,
  json,
  logServerEvent,
  readSingle,
  setCommonHeaders,
  validateIataCode,
  withMemoryCache,
  type HandlerRequest,
  type HandlerResponse,
} from './_http.js'

type AirportSearchPayload = {
  data?: DuffelPlaceSuggestion[]
}

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  setCommonHeaders(res, 's-maxage=900, stale-while-revalidate=1800')

  if (req.method && req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  if (!enforceRateLimit(req, res, { scope: 'airport-search', limit: 40, windowMs: 60_000 })) {
    return
  }

  const keyword = readSingle(req.query?.q).trim()
  const max = Number(readSingle(req.query?.max, '8'))

  if (keyword.length < 2) {
    json(res, 200, { data: [] })
    return
  }

  try {
    if (/^[A-Z]{3}$/.test(keyword.toUpperCase())) {
      validateIataCode(keyword.toUpperCase(), 'Airport search code')
    }

    const payload = await withMemoryCache(
      `airport-search:${keyword.toLowerCase()}:${Math.max(1, Math.min(max, 10))}`,
      30 * 60 * 1000,
      async () => {
        const response = await fetchDuffelJson<AirportSearchPayload>('/places/suggestions', {
          params: {
            query: keyword,
          },
        })

        return {
          data: (response.data ?? []).slice(0, Math.max(1, Math.min(max, 10))),
        }
      },
    )

    logServerEvent('info', 'airport_search.success', {
      keyword,
      max,
      resultCount: payload.data?.length ?? 0,
    })

    json(res, 200, payload)
  } catch (error) {
    logServerEvent('error', 'airport_search.failure', {
      keyword,
      message: error instanceof Error ? error.message : 'Unexpected airport lookup failure.',
    })
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Unexpected airport lookup failure.',
    })
  }
}
