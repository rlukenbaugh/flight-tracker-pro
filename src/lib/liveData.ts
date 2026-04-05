import type { CabinClass, FlightResult, SearchState, WeatherSnapshot } from '../types'
import { destinationCoordinates } from '../data/appConfig'

interface LiveFlightApiResponse {
  data?: AmadeusFlightOffer[]
  dictionaries?: {
    carriers?: Record<string, string>
  }
}

interface AmadeusFlightOffer {
  id: string
  itineraries: Array<{
    duration?: string
    segments: Array<{
      carrierCode: string
      number: string
      departure: { iataCode: string; at: string }
      arrival: { iataCode: string; at: string }
      aircraft?: { code?: string }
    }>
  }>
  price: {
    grandTotal: string
  }
  travelerPricings?: Array<{
    fareOption?: string
    fareDetailsBySegment?: Array<{
      cabin?: CabinClass | string
      includedCheckedBags?: { quantity?: number }
    }>
  }>
  validatingAirlineCodes?: string[]
  numberOfBookableSeats?: number
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

function carrierName(
  dictionaries: LiveFlightApiResponse['dictionaries'],
  code: string | undefined,
) {
  if (!code) {
    return 'Partner airline'
  }

  return dictionaries?.carriers?.[code] ?? code
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

  const response = await fetch(`/api/flight-offers?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Live flight search failed with status ${response.status}`)
  }

  const payload = (await response.json()) as LiveFlightApiResponse
  const offers = payload.data ?? []

  const mapped = offers.map((offer) => {
    const firstItinerary = offer.itineraries[0]
    const segments = firstItinerary?.segments ?? []
    const firstSegment = segments[0]
    const lastSegment = segments[segments.length - 1]
    const airlineCode = offer.validatingAirlineCodes?.[0] ?? firstSegment?.carrierCode
    const airline = carrierName(payload.dictionaries, airlineCode)
    const checkedBagQuantity =
      offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags?.quantity ?? 0
    const fareOption = offer.travelerPricings?.[0]?.fareOption ?? 'STANDARD'
    const totalPrice = Math.round(Number(offer.price.grandTotal))
    const delayRisk: FlightResult['delayRisk'] = segments.length > 1 ? 'Moderate' : 'Low'
    const fareProfile: FlightResult['fareProfile'] =
      fareOption === 'STANDARD' ? 'Standard' : fareOption === 'INCLUSIVE' ? 'Flex' : 'Saver'

    return {
      id: `live-${offer.id}-${search.cabinClass}`,
      templateId: `live-${offer.id}`,
      origin: search.origin,
      destination: search.destination,
      airline,
      flightNumber: `${airlineCode ?? '--'} ${firstSegment?.number ?? offer.id}`,
      departureTime: firstSegment ? parseTime(firstSegment.departure.at) : '--:--',
      arrivalTime: lastSegment ? parseTime(lastSegment.arrival.at) : '--:--',
      totalMinutes: parseDuration(firstItinerary?.duration),
      stops: Math.max(0, segments.length - 1),
      layovers: segments.slice(0, -1).map((segment) => segment.arrival.iataCode),
      layoverMinutes: segments.slice(0, -1).map(() => 90),
      cabinClass: search.cabinClass,
      totalPrice,
      pricePerTraveler: Math.round(totalPrice / search.travelers),
      refundable: fareOption !== 'STANDARD',
      carryOnIncluded: true,
      checkedBagIncluded: checkedBagQuantity > 0,
      airlineQuality: inferAirlineQuality(airline),
      delayRisk,
      aircraft: firstSegment?.aircraft?.code ?? 'Unknown aircraft',
      regionalAircraft: false,
      terminalNote: 'Live provider data connected. Terminal changes depend on airline feeds.',
      estimatedBagFees: checkedBagQuantity > 0 ? 0 : 35 * search.travelers,
      estimatedExtras: 28 * search.travelers,
      totalEstimatedTripCost: totalPrice + (checkedBagQuantity > 0 ? 0 : 35 * search.travelers) + 28 * search.travelers,
      warnings: segments.length > 1 ? ['Connection quality depends on airline schedule resilience.'] : [],
      seatInsight: 'Live fare loaded. Seat specifics require seat-map partner data.',
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
