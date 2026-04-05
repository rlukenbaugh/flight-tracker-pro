type HandlerRequest = {
  method?: string
  query?: Record<string, string | string[] | undefined>
}

type HandlerResponse = {
  status: (code: number) => HandlerResponse
  json: (body: unknown) => void
  setHeader: (name: string, value: string) => void
}

const AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token'
const SEARCH_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers'

function readSingle(value: string | string[] | undefined, fallback = '') {
  return Array.isArray(value) ? value[0] ?? fallback : value ?? fallback
}

async function fetchAmadeusToken() {
  const clientId = process.env.AMADEUS_CLIENT_ID
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are required for live flights.')
  }

  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    throw new Error(`Amadeus auth failed with status ${response.status}.`)
  }

  const payload = (await response.json()) as { access_token: string }
  return payload.access_token
}

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  if (req.method && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const token = await fetchAmadeusToken()
    const origin = readSingle(req.query?.origin).toUpperCase()
    const destination = readSingle(req.query?.destination).toUpperCase()
    const departureDate = readSingle(req.query?.departureDate)
    const returnDate = readSingle(req.query?.returnDate)
    const tripType = readSingle(req.query?.tripType, 'round-trip')
    const travelers = readSingle(req.query?.travelers, '1')
    const cabinClass = readSingle(req.query?.cabinClass, 'ECONOMY').toUpperCase()

    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: travelers,
      travelClass: cabinClass.replace(' ', '_'),
      currencyCode: 'USD',
      max: '12',
    })

    if (tripType === 'round-trip' && returnDate) {
      params.set('returnDate', returnDate)
    }

    const response = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      const details = await response.text()
      res.status(response.status).json({
        error: 'Live flight search failed.',
        details,
      })
      return
    }

    const payload = await response.json()
    res.status(200).json(payload)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected live flight failure.',
    })
  }
}
