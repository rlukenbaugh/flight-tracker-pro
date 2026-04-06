type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First'

type DuffelQueryValue = string | number | boolean | undefined | null

type DuffelOfferRequestPayload = {
  data: {
    id?: string
    live_mode?: boolean
    offers?: DuffelOffer[]
  }
}

export type DuffelOffer = {
  id: string
  total_amount?: string
  total_currency?: string
  owner?: {
    name?: string
    iata_code?: string
  }
  conditions?: {
    refund_before_departure?: {
      allowed?: boolean
    }
    change_before_departure?: {
      allowed?: boolean
    }
  }
  slices?: Array<{
    duration?: string
    fare_brand_name?: string
    segments?: Array<{
      departing_at?: string
      arriving_at?: string
      origin_terminal?: string
      destination_terminal?: string
      origin?: {
        iata_code?: string
        city_name?: string
        name?: string
      }
      destination?: {
        iata_code?: string
        city_name?: string
        name?: string
      }
      operating_carrier?: {
        name?: string
        iata_code?: string
      }
      marketing_carrier?: {
        name?: string
        iata_code?: string
      }
      aircraft?: {
        iata_code?: string
        name?: string
      }
      passengers?: Array<{
        baggages?: Array<{
          type?: string
          quantity?: number
        }>
      }>
    }>
  }>
}

export type DuffelPlaceSuggestion = {
  id?: string
  type?: 'airport' | 'city'
  iata_code?: string
  iata_city_code?: string
  iata_country_code?: string
  city_name?: string
  name?: string
  latitude?: number
  longitude?: number
  airports?: Array<{
    iata_code?: string
    name?: string
    city_name?: string
    latitude?: number
    longitude?: number
  }>
}

const DEFAULT_BASE_URL = 'https://api.duffel.com'

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function getDuffelBaseUrl() {
  return trimTrailingSlash(process.env.DUFFEL_API_BASE_URL || DEFAULT_BASE_URL)
}

export function buildDuffelUrl(path: string, params?: Record<string, DuffelQueryValue>) {
  const url = new URL(path, `${getDuffelBaseUrl()}/`)

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

function getDuffelHeaders() {
  const token = process.env.DUFFEL_API_TOKEN

  if (!token) {
    throw new Error('DUFFEL_API_TOKEN is required for live flights.')
  }

  return {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip',
    Authorization: `Bearer ${token}`,
    'Duffel-Version': 'v2',
  }
}

export async function fetchDuffelJson<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST'
    params?: Record<string, DuffelQueryValue>
    body?: unknown
  },
) {
  const response = await fetch(buildDuffelUrl(path, options?.params), {
    method: options?.method ?? 'GET',
    headers: {
      ...getDuffelHeaders(),
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Duffel request failed with status ${response.status}: ${details}`)
  }

  return (await response.json()) as T
}

export function mapCabinClassToDuffel(cabinClass: string) {
  switch (cabinClass) {
    case 'Economy':
    case 'ECONOMY':
      return 'economy'
    case 'Premium Economy':
    case 'PREMIUM_ECONOMY':
    case 'PREMIUM ECONOMY':
      return 'premium_economy'
    case 'Business':
    case 'BUSINESS':
      return 'business'
    case 'First':
    case 'FIRST':
      return 'first'
    default:
      throw new Error('Cabin class is not supported.')
  }
}

export async function createDuffelOfferRequest(options: {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  tripType: 'round-trip' | 'one-way'
  travelers: number
  cabinClass: CabinClass | string
  maxConnections?: number
  supplierTimeoutMs?: number
}) {
  const slices = [
    {
      origin: options.origin,
      destination: options.destination,
      departure_date: options.departureDate,
    },
  ]

  if (options.tripType === 'round-trip' && options.returnDate) {
    slices.push({
      origin: options.destination,
      destination: options.origin,
      departure_date: options.returnDate,
    })
  }

  return fetchDuffelJson<DuffelOfferRequestPayload>('/air/offer_requests', {
    method: 'POST',
    params: {
      return_offers: true,
      supplier_timeout: options.supplierTimeoutMs ?? 12000,
    },
    body: {
      data: {
        cabin_class: mapCabinClassToDuffel(options.cabinClass),
        max_connections: options.maxConnections ?? 1,
        passengers: Array.from({ length: options.travelers }, () => ({ type: 'adult' })),
        slices,
      },
    },
  })
}
