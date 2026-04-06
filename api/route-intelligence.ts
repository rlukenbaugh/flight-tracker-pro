import { recordFareSnapshot } from './_database.js'
import { createDuffelOfferRequest } from './_duffel.js'
import {
  enforceRateLimit,
  json,
  logServerEvent,
  readSingle,
  setCommonHeaders,
  validateDate,
  validateIataCode,
  validateTravelerCount,
  validateTripType,
  withMemoryCache,
  type HandlerRequest,
  type HandlerResponse,
} from './_http.js'

type CalendarPoint = {
  date: string
  price: number
}

type MapDestinationSeed = {
  airport: string
  city: string
  latitude: number
  longitude: number
}

const destinationMapSeeds: Record<string, MapDestinationSeed> = {
  ATL: { airport: 'ATL', city: 'Atlanta', latitude: 33.6407, longitude: -84.4277 },
  CDG: { airport: 'CDG', city: 'Paris', latitude: 49.0097, longitude: 2.5479 },
  DEN: { airport: 'DEN', city: 'Denver', latitude: 39.8561, longitude: -104.6737 },
  DFW: { airport: 'DFW', city: 'Dallas', latitude: 32.8998, longitude: -97.0403 },
  HND: { airport: 'HND', city: 'Tokyo', latitude: 35.5494, longitude: 139.7798 },
  JFK: { airport: 'JFK', city: 'New York', latitude: 40.6413, longitude: -73.7781 },
  LAX: { airport: 'LAX', city: 'Los Angeles', latitude: 33.9416, longitude: -118.4085 },
  LHR: { airport: 'LHR', city: 'London', latitude: 51.47, longitude: -0.4543 },
  MIA: { airport: 'MIA', city: 'Miami', latitude: 25.7959, longitude: -80.287 },
  ORD: { airport: 'ORD', city: 'Chicago', latitude: 41.9742, longitude: -87.9073 },
  PPT: { airport: 'PPT', city: 'Papeete', latitude: -17.5537, longitude: -149.6063 },
  SEA: { airport: 'SEA', city: 'Seattle', latitude: 47.4502, longitude: -122.3088 },
  STT: { airport: 'STT', city: 'St. Thomas', latitude: 18.3373, longitude: -64.9734 },
  SYD: { airport: 'SYD', city: 'Sydney', latitude: -33.9399, longitude: 151.1753 },
}

const destinationCandidatesByOrigin: Record<string, string[]> = {
  ATL: ['MIA', 'JFK', 'DEN', 'LAX'],
  DFW: ['DEN', 'MIA', 'LAX', 'JFK'],
  JFK: ['MIA', 'LAX', 'DEN', 'SEA'],
  LAX: ['SEA', 'DEN', 'JFK', 'MIA'],
  LHR: ['JFK', 'CDG', 'HND', 'PPT'],
  ORD: ['DEN', 'MIA', 'SEA', 'LAX'],
  SEA: ['LAX', 'DEN', 'JFK', 'MIA'],
}

function addDays(base: string, offset: number) {
  const date = new Date(`${base}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function projectPoint(latitude: number, longitude: number) {
  const x = Math.max(10, Math.min(92, ((longitude + 180) / 360) * 100))
  const y = Math.max(8, Math.min(54, ((90 - latitude) / 180) * 62))
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
  }
}

function buildCheapestWeekLabel(calendar: CalendarPoint[]) {
  if (calendar.length === 0) {
    return 'No sampled date sweep'
  }

  const cheapest = [...calendar].sort((left, right) => left.price - right.price)[0]
  const label = new Date(`${cheapest.date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${label} sample window`
}

function calculateStayLength(departureDate: string, returnDate?: string) {
  if (!returnDate) {
    return 4
  }

  return Math.max(
    1,
    Math.round(
      (new Date(`${returnDate}T12:00:00`).getTime() -
        new Date(`${departureDate}T12:00:00`).getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  )
}

async function cheapestOfferPrice(options: {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  tripType: 'round-trip' | 'one-way'
  travelers: number
  cabinClass: string
}) {
  const payload = await createDuffelOfferRequest({
    ...options,
    maxConnections: 1,
    supplierTimeoutMs: 7500,
  })

  const prices = (payload.data?.offers ?? [])
    .map((offer) => Number(offer.total_amount ?? 0))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((left, right) => left - right)

  return prices[0] ?? 0
}

function buildCalendarPayload(calendar: CalendarPoint[]) {
  if (calendar.length === 0) {
    return []
  }

  const min = Math.min(...calendar.map((item) => item.price))
  const max = Math.max(...calendar.map((item) => item.price))

  return calendar.map((item) => ({
    date: item.date,
    price: item.price,
    valueScore:
      max === min
        ? 90
        : Math.max(65, Math.min(98, Math.round(98 - ((item.price - min) / Math.max(1, max - min)) * 32))),
  }))
}

function getDestinationCandidates(origin: string, destination: string) {
  const preferred = destinationCandidatesByOrigin[origin] ?? ['DEN', 'MIA', 'LAX', 'JFK']
  return preferred.filter((code) => code !== origin && code !== destination).slice(0, 4)
}

function buildHistory(prices: number[]) {
  if (prices.length === 0) {
    return []
  }

  const sorted = [...prices].sort((left, right) => left - right)
  const low = sorted[0]
  const med = median(sorted)
  const high = sorted[sorted.length - 1]

  return [low, low, med, med, high, med, low].filter((value) => value > 0)
}

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  setCommonHeaders(res, 's-maxage=900, stale-while-revalidate=1800')

  if (req.method && req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  if (!enforceRateLimit(req, res, { scope: 'route-intelligence', limit: 12, windowMs: 60_000 })) {
    return
  }

  try {
    const origin = readSingle(req.query?.origin).toUpperCase()
    const destination = readSingle(req.query?.destination).toUpperCase()
    const departureDate = readSingle(req.query?.departureDate)
    const tripType = readSingle(req.query?.tripType, 'round-trip')
    const returnDate = readSingle(req.query?.returnDate)
    const travelers = Number(readSingle(req.query?.travelers, '1'))
    const cabinClass = readSingle(req.query?.cabinClass, 'Economy')

    validateIataCode(origin, 'Origin')
    validateIataCode(destination, 'Destination')
    validateDate(departureDate, 'Departure date')
    if (tripType === 'round-trip' && returnDate) {
      validateDate(returnDate, 'Return date')
    }
    validateTravelerCount(travelers)
    validateTripType(tripType)

    const stayLength = calculateStayLength(departureDate, returnDate)
    const sweepOffsets = [-3, 0, 3, 6, 9, 12, 15, 18, 21, 24, 27]
    const cacheKey = [
      'route-intel',
      origin,
      destination,
      departureDate,
      returnDate,
      tripType,
      travelers,
      cabinClass,
    ].join(':')

    const responsePayload = await withMemoryCache(cacheKey, 15 * 60 * 1000, async () => {
      const calendarCandidates = await Promise.all(
        sweepOffsets.map(async (offset) => {
          const sampledDeparture = addDays(departureDate, offset)
          const sampledReturn =
            tripType === 'round-trip' ? addDays(sampledDeparture, stayLength) : undefined

          try {
            const cheapestPrice = await cheapestOfferPrice({
              origin,
              destination,
              departureDate: sampledDeparture,
              returnDate: sampledReturn,
              tripType: tripType as 'round-trip' | 'one-way',
              travelers,
              cabinClass,
            })

            return cheapestPrice > 0
              ? {
                  date: sampledDeparture,
                  price: Math.round(cheapestPrice),
                }
              : null
          } catch {
            return null
          }
        }),
      )

      const calendarRaw = calendarCandidates
        .filter((item): item is CalendarPoint => Boolean(item))
        .sort((left, right) => left.date.localeCompare(right.date))
      const calendarPrices = calendarRaw.map((item) => item.price)

      const destinationPoints = (
        await Promise.all(
          getDestinationCandidates(origin, destination).map(async (candidate) => {
            const seed = destinationMapSeeds[candidate]
            if (!seed) {
              return null
            }

            try {
              const cheapestPrice = await cheapestOfferPrice({
                origin,
                destination: candidate,
                departureDate,
                returnDate: tripType === 'round-trip' ? addDays(departureDate, stayLength) : undefined,
                tripType: tripType as 'round-trip' | 'one-way',
                travelers,
                cabinClass,
              })

              if (!cheapestPrice) {
                return null
              }

              const projected = projectPoint(seed.latitude, seed.longitude)

              return {
                airport: seed.airport,
                city: seed.city,
                x: projected.x,
                y: projected.y,
                price: Math.round(cheapestPrice),
                valueTag: 'Live sampled fare',
                summary: `Sampled live fare for ${departureDate}${tripType === 'round-trip' ? ` with ${stayLength}-night stay` : ''}`,
              }
            } catch {
              return null
            }
          }),
        )
      ).filter((item): item is NonNullable<typeof item> => Boolean(item))

      return {
        calendar: buildCalendarPayload(calendarRaw),
        cheapestWeek: buildCheapestWeekLabel(calendarRaw),
        benchmark:
          calendarPrices.length > 0
            ? {
                low: Math.min(...calendarPrices),
                median: median(calendarPrices),
                high: Math.max(...calendarPrices),
                history: buildHistory(calendarPrices),
              }
            : null,
        destinationPoints,
        sources: {
          calendar: 'Duffel live sampled date sweep',
          benchmark: 'Duffel live sampled fare benchmark',
          destinations: 'Duffel live sampled destination sweep',
        },
      }
    })

    if (responsePayload.benchmark) {
      void recordFareSnapshot({
        routeKey: `${origin}-${destination}`,
        origin,
        destination,
        departureDate,
        returnDate: tripType === 'round-trip' ? returnDate : undefined,
        tripType,
        source: 'duffel.route-intelligence',
        cheapestPrice: responsePayload.benchmark.low,
        medianPrice: responsePayload.benchmark.median,
        sampleSize: responsePayload.calendar.length,
        metadata: {
          cheapestWeek: responsePayload.cheapestWeek,
          travelers,
          cabinClass,
        },
      }).catch((error) => {
        logServerEvent('warn', 'fare_snapshot.write_failed', {
          routeKey: `${origin}-${destination}`,
          message: error instanceof Error ? error.message : 'Unknown route intelligence snapshot failure.',
        })
      })
    }

    logServerEvent('info', 'route_intelligence.success', {
      routeKey: `${origin}-${destination}`,
      calendarCount: responsePayload.calendar.length,
      destinationCount: responsePayload.destinationPoints.length,
      hasBenchmark: Boolean(responsePayload.benchmark),
    })

    json(res, 200, responsePayload)
  } catch (error) {
    logServerEvent('error', 'route_intelligence.failure', {
      message: error instanceof Error ? error.message : 'Unexpected route intelligence failure.',
    })
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Unexpected route intelligence failure.',
    })
  }
}
