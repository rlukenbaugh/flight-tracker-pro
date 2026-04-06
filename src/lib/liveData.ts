import type {
  AirportOption,
  CalendarPrice,
  DestinationPoint,
  FlightResult,
  RouteInsight,
  SearchState,
  WeatherSnapshot,
} from '../types'
import { destinationCoordinates } from '../data/appConfig'
import { buildApiUrl } from './runtimeConfig'

interface LiveFlightApiResponse {
  data?: DuffelOffer[]
  requestId?: string
  liveMode?: boolean
  source?: string
}

interface LiveAirportSearchResponse {
  data?: DuffelPlaceSuggestion[]
}

interface LiveRouteIntelligenceResponse {
  calendar?: CalendarPrice[]
  cheapestWeek?: string
  benchmark?: {
    low: number
    median: number
    high: number
    history: number[]
  } | null
  destinationPoints?: DestinationPoint[]
  sources?: {
    calendar?: string
    benchmark?: string
    destinations?: string
  }
}

export interface LiveRouteIntelligence {
  insight?: RouteInsight
  calendar?: CalendarPrice[]
  cheapestWeek?: string
  destinationPoints: DestinationPoint[]
  sources: {
    calendar?: string
    benchmark?: string
    destinations?: string
  }
}

interface DuffelPlaceSuggestion {
  type?: 'airport' | 'city'
  iata_code?: string
  iata_city_code?: string
  iata_country_code?: string
  city_name?: string
  name?: string
  airports?: Array<{
    iata_code?: string
    name?: string
    city_name?: string
  }>
}

interface DuffelOffer {
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
  }
  slices?: Array<{
    duration?: string
    fare_brand_name?: string
    segments?: Array<{
      departing_at?: string
      arriving_at?: string
      origin_terminal?: string
      destination_terminal?: string
      origin?: { iata_code?: string; city_name?: string; name?: string }
      destination?: { iata_code?: string; city_name?: string; name?: string }
      marketing_carrier?: { name?: string; iata_code?: string }
      operating_carrier?: { name?: string; iata_code?: string }
      aircraft?: { iata_code?: string; name?: string }
      passengers?: Array<{
        baggages?: Array<{
          type?: string
          quantity?: number
        }>
      }>
    }>
  }>
}

function parseTime(value: string) {
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function parseDuration(duration: string | undefined) {
  if (!duration) {
    return 0
  }

  const hours = Number(duration.match(/(\d+)H/)?.[1] ?? 0)
  const minutes = Number(duration.match(/(\d+)M/)?.[1] ?? 0)
  return hours * 60 + minutes
}

function inferAirlineQuality(airline: string) {
  if (airline.includes('Delta') || airline.includes('Alaska')) {
    return 8.6
  }

  if (airline.includes('United') || airline.includes('JetBlue')) {
    return 7.9
  }

  return 7.5
}

function normalizeInverse(value: number, min: number, max: number) {
  if (max === min) {
    return 100
  }

  return 100 - ((value - min) / (max - min)) * 100
}

function diffMinutes(start: string | undefined, end: string | undefined) {
  if (!start || !end) {
    return 0
  }

  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
}

function parseDuffelDuration(
  value: string | undefined,
  segments: NonNullable<DuffelOffer['slices']>[number]['segments'] = [],
) {
  const direct = parseDuration(value)
  if (direct > 0) {
    return direct
  }

  const first = segments?.[0]?.departing_at
  const last = segments?.[segments.length - 1]?.arriving_at
  return diffMinutes(first, last)
}

function collectBaggageIncluded(
  segments: NonNullable<DuffelOffer['slices']>[number]['segments'] = [],
  allowedTypes: string[],
) {
  const normalizedTypes = allowedTypes.map((type) => type.toLowerCase())

  return segments.some((segment) =>
    (segment.passengers ?? []).some((passenger) =>
      (passenger.baggages ?? []).some(
        (baggage) =>
          normalizedTypes.includes((baggage.type ?? '').toLowerCase()) &&
          (baggage.quantity ?? 0) > 0,
      ),
    ),
  )
}

function buildLiveBenchmarkInsight(
  search: SearchState,
  benchmark: NonNullable<LiveRouteIntelligenceResponse['benchmark']>,
): RouteInsight {
  const recentAverage = benchmark.median
  const monthLowest = benchmark.low
  const weekLowest = Math.min(benchmark.low, benchmark.median)
  const weeklyChangePercent = 0
  const summary =
    recentAverage > 0
      ? `Sampled live pricing shows a median fare near $${recentAverage}, with lows around $${benchmark.low} and upper-range fares near $${benchmark.high}.`
      : 'Sampled live pricing is available for this route.'

  return {
    routeKey: `${search.origin}-${search.destination}`,
    weekLowest,
    monthLowest,
    direction: 'stable',
    weeklyChangePercent,
    monthlyAverage: recentAverage,
    recentAverage,
    summary,
    buyRecommendation:
      'Use this sampled live benchmark as a reference point. Final bookable pricing still depends on the specific live flight offer you choose.',
    historicalTip:
      'This trend card is based on sampled live searches, not the older simulated history model.',
    cheapestWeek: 'Sampled live date sweep active',
    weatherSummary: 'Destination weather comes from Open-Meteo.',
    timezoneDifference: 'Live time-zone intelligence not connected yet.',
    history: benchmark.history,
    calendar: [],
  }
}

export async function searchLiveFlights(
  search: SearchState,
  flexDays: number,
): Promise<FlightResult[]> {
  const params = new URLSearchParams({
    origin: search.origin,
    destination: search.destination,
    departureDate: search.departureDate,
    returnDate: search.returnDate,
    tripType: search.tripType,
    travelers: String(search.travelers),
    cabinClass: search.cabinClass,
    flexDays: String(flexDays),
  })

  const response = await fetch(buildApiUrl(`/api/flight-offers?${params.toString()}`))

  if (!response.ok) {
    throw new Error(`Live flight search failed with status ${response.status}`)
  }

  const payload = (await response.json()) as LiveFlightApiResponse
  const offers = payload.data ?? []

  const mapped = offers.map((offer) => {
    const firstSlice = offer.slices?.[0]
    const segments = firstSlice?.segments ?? []
    const firstSegment = segments[0]
    const lastSegment = segments[segments.length - 1]
    const airline =
      firstSegment?.operating_carrier?.name ??
      firstSegment?.marketing_carrier?.name ??
      offer.owner?.name ??
      'Partner airline'
    const airlineCode =
      firstSegment?.operating_carrier?.iata_code ??
      firstSegment?.marketing_carrier?.iata_code ??
      offer.owner?.iata_code
    const checkedBagIncluded = collectBaggageIncluded(segments, ['checked'])
    const carryOnIncluded = collectBaggageIncluded(segments, ['carry_on', 'carry-on', 'cabin'])
    const totalPrice = Math.round(Number(offer.total_amount ?? 0))
    const layoverMinutes = segments.slice(0, -1).map((segment, index) =>
      diffMinutes(segment.arriving_at, segments[index + 1]?.departing_at),
    )
    const tightConnection = layoverMinutes.some((minutes) => minutes > 0 && minutes < 50)
    const overnightLayover = layoverMinutes.some((minutes) => minutes >= 480)
    const warnings = []

    if (tightConnection) {
      warnings.push('This itinerary has a tight connection under 50 minutes.')
    }
    if (overnightLayover) {
      warnings.push('This itinerary includes a long overnight layover.')
    }

    const fareProfile: FlightResult['fareProfile'] =
      firstSlice?.fare_brand_name?.toLowerCase().includes('basic')
        ? 'Saver'
        : offer.conditions?.refund_before_departure?.allowed
          ? 'Flex'
          : 'Standard'
    const delayRisk: FlightResult['delayRisk'] = tightConnection
      ? 'Elevated'
      : segments.length > 1
        ? 'Moderate'
        : 'Low'

    return {
      id: `live-${offer.id}-${search.cabinClass}`,
      templateId: `live-${offer.id}`,
      origin: search.origin,
      destination: search.destination,
      airline,
      flightNumber: `${airlineCode ?? '--'} ${offer.id.slice(-6).toUpperCase()}`,
      departureTime: firstSegment?.departing_at ? parseTime(firstSegment.departing_at) : '--:--',
      arrivalTime: lastSegment?.arriving_at ? parseTime(lastSegment.arriving_at) : '--:--',
      totalMinutes: parseDuffelDuration(firstSlice?.duration, segments),
      stops: Math.max(0, segments.length - 1),
      layovers: segments.slice(0, -1).map((segment) => segment.destination?.iata_code ?? '---'),
      layoverMinutes,
      cabinClass: search.cabinClass,
      totalPrice,
      pricePerTraveler: Math.round(totalPrice / search.travelers),
      refundable: Boolean(offer.conditions?.refund_before_departure?.allowed),
      carryOnIncluded,
      checkedBagIncluded,
      airlineQuality: inferAirlineQuality(airline),
      delayRisk,
      aircraft: firstSegment?.aircraft?.name ?? firstSegment?.aircraft?.iata_code ?? 'Unknown aircraft',
      regionalAircraft: ['E75', 'CRJ', 'CR9', 'AT7', 'DH4'].some((code) =>
        (firstSegment?.aircraft?.iata_code ?? '').toUpperCase().includes(code),
      ),
      terminalNote:
        firstSegment?.origin_terminal || lastSegment?.destination_terminal
          ? `Terminals: depart ${firstSegment?.origin_terminal ?? 'TBD'}${lastSegment?.destination_terminal ? `, arrive ${lastSegment.destination_terminal}` : ''}.`
          : 'Live provider data connected. Terminal changes depend on airline feeds.',
      estimatedBagFees: checkedBagIncluded ? 0 : 35 * search.travelers,
      estimatedExtras: 28 * search.travelers,
      totalEstimatedTripCost:
        totalPrice + (checkedBagIncluded ? 0 : 35 * search.travelers) + 28 * search.travelers,
      warnings,
      seatInsight: carryOnIncluded
        ? 'Live fare loaded. Seat specifics still require seat-map partner data.'
        : 'Carry-on allowance was not explicit in the live fare data. Confirm baggage rules before booking.',
      fareProfile,
      score: 0,
      dealLabel: '🟡 Fair',
    }
  })

  const priceMin = Math.min(...mapped.map((flight) => flight.pricePerTraveler))
  const priceMax = Math.max(...mapped.map((flight) => flight.pricePerTraveler))
  const durationMin = Math.min(...mapped.map((flight) => flight.totalMinutes))
  const durationMax = Math.max(...mapped.map((flight) => flight.totalMinutes))
  const stopMin = Math.min(...mapped.map((flight) => flight.stops))
  const stopMax = Math.max(...mapped.map((flight) => flight.stops))

  return mapped
    .map((flight) => {
      const score = Math.round(
        normalizeInverse(flight.pricePerTraveler, priceMin, priceMax) * 0.4 +
          normalizeInverse(flight.totalMinutes, durationMin, durationMax) * 0.25 +
          normalizeInverse(flight.stops, stopMin, stopMax) * 0.2 +
          flight.airlineQuality * 10 * 0.15,
      )
      const dealLabel: FlightResult['dealLabel'] =
        score >= 80 ? '🟢 Excellent Deal' : score >= 62 ? '🟡 Fair' : '🔴 Overpriced'

      return {
        ...flight,
        score,
        dealLabel,
      }
    })
    .sort((left, right) => left.totalPrice - right.totalPrice)
}

export async function searchLiveAirports(query: string): Promise<AirportOption[]> {
  if (query.trim().length < 2) {
    return []
  }

  const response = await fetch(
    buildApiUrl(`/api/airport-search?q=${encodeURIComponent(query)}&max=8`),
  )
  if (!response.ok) {
    throw new Error(`Airport search failed with status ${response.status}`)
  }

  const payload = (await response.json()) as LiveAirportSearchResponse

  return (payload.data ?? [])
    .filter((item) => item.iata_code && (item.city_name || item.name))
    .map((item) => ({
      code: item.iata_code ?? '',
      city: item.city_name ?? item.name ?? 'Unknown city',
      airport:
        item.type === 'city'
          ? `${item.name ?? item.city_name ?? 'Unknown city'} metro area`
          : item.name ?? item.city_name ?? 'Unknown airport',
      country: item.iata_country_code ?? 'Unknown country',
      metro: item.city_name ?? item.iata_city_code,
      priority: item.type === 'city' ? 95 : 85,
      aliases:
        item.type === 'city'
          ? (item.airports ?? [])
              .map((airport) => airport.iata_code ?? '')
              .filter(Boolean)
          : undefined,
    }))
}

export async function fetchLiveRouteIntelligence(
  search: SearchState,
): Promise<LiveRouteIntelligence> {
  const params = new URLSearchParams({
    origin: search.origin,
    destination: search.destination,
    departureDate: search.departureDate,
    returnDate: search.returnDate,
    tripType: search.tripType,
    travelers: String(search.travelers),
    cabinClass: search.cabinClass,
  })

  const response = await fetch(buildApiUrl(`/api/route-intelligence?${params.toString()}`))
  if (!response.ok) {
    throw new Error(`Route intelligence failed with status ${response.status}`)
  }

  const payload = (await response.json()) as LiveRouteIntelligenceResponse

  return {
    insight: payload.benchmark ? buildLiveBenchmarkInsight(search, payload.benchmark) : undefined,
    calendar: payload.calendar,
    cheapestWeek: payload.cheapestWeek,
    destinationPoints: payload.destinationPoints ?? [],
    sources: payload.sources ?? {},
  }
}

export async function fetchDestinationWeather(airportCode: string): Promise<WeatherSnapshot | null> {
  const destination = destinationCoordinates[airportCode]
  if (!destination) {
    return null
  }

  const params = new URLSearchParams({
    latitude: String(destination.latitude),
    longitude: String(destination.longitude),
    current: 'temperature_2m,wind_speed_10m,weather_code',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto',
  })

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Weather lookup failed with status ${response.status}`)
  }

  const payload = (await response.json()) as {
    current?: {
      temperature_2m?: number
      wind_speed_10m?: number
      weather_code?: number
    }
  }

  const current = payload.current
  if (!current?.temperature_2m || !current.wind_speed_10m) {
    return null
  }

  return {
    summary: `${Math.round(current.temperature_2m)}°F in ${destination.city}, winds ${Math.round(current.wind_speed_10m)} mph, code ${current.weather_code ?? 'n/a'}.`,
    temperatureF: Math.round(current.temperature_2m),
    windMph: Math.round(current.wind_speed_10m),
  }
}
