type QueryValue = string | number | boolean | undefined | null

const DEFAULT_BASE_URL = 'https://api.amadeus.com'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function getAmadeusBaseUrl() {
  return trimTrailingSlash(process.env.AMADEUS_API_BASE_URL || DEFAULT_BASE_URL)
}

export function buildAmadeusUrl(path: string, params?: Record<string, QueryValue>) {
  const url = new URL(path, `${getAmadeusBaseUrl()}/`)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        continue
      }

      url.searchParams.set(key, String(value))
    }
  }

  return url.toString()
}

export async function fetchAmadeusToken() {
  const clientId = process.env.AMADEUS_CLIENT_ID
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET are required for live flights.')
  }

  const response = await fetch(buildAmadeusUrl('/v1/security/oauth2/token'), {
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

export async function fetchAmadeusJson<T>(
  path: string,
  token: string,
  params?: Record<string, QueryValue>,
) {
  const response = await fetch(buildAmadeusUrl(path, params), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Amadeus request failed with status ${response.status}: ${details}`)
  }

  return (await response.json()) as T
}
