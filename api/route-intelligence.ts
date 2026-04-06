import { recordFareSnapshot } from './_database.js'
import { fetchAmadeusJson, fetchAmadeusToken } from './_amadeus.js'
import {
  enforceRateLimit,
  json,
  logServerEvent,
  readSingle,
  setCommonHeaders,
  validateDate,
  validateIataCode,
  validateTripType,
  withMemoryCache,
  type HandlerRequest,
  type HandlerResponse,
} from './_http.js'

type FlightDatesPayload = {
  data?: Array<{
    departureDate?: string
    returnDate?: string
    price?: { total?: string }
  }>
}

type PriceMetricsPayload = {
  data?: Array<{
    priceMetrics?: Array<{
      amount?: string
      quartileRanking?: string
    }>
  }>
}

type FlightDestinationsPayload = {
  data?: Array<{
    destination?: string
    departureDate?: string
    returnDate?: string
    price?: { total?: string }
  }>
}

type LocationPayload = {
  data?: Array<{
    iataCode?: string
    name?: string
    address?: {
      cityName?: string
      countryName?: string
    }
    geoCode?: {
      latitude?: number
      longitude?: number
    }
  }>
}

function addDays(base: string, offset: number) {
  const date = new Date(`${base}T12:00:00`)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1))
}

function priceValue(value: string | undefined) {
  return Math.round(Number(value ?? 0))
}

function projectPoint(latitude: number, longitude: number) {
  const x = Math.max(10, Math.min(92, ((longitude + 180) / 360) * 100))
  const y = Math.max(8, Math.min(54, ((90 - latitude) / 180) * 62))
  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
  }
}

function buildCheapestWeekLabel(calendar: Array<{ date: string; price: number }>) {
  if (calendar.length < 7) {
    return calendar[0]?.date ?? 'No live date sweep'
  }

  let bestStart = 0
  let bestAverage = Number.POSITIVE_INFINITY

  for (let index = 0; index <= calendar.length - 7; index += 1) {
    const window = calendar.slice(index, index + 7)
    const windowAverage = average(window.map((day) => day.price))
    if (windowAverage < bestAverage) {
      bestAverage = windowAverage
      bestStart = index
    }
  }

  const start = new Date(`${calendar[bestStart].date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const end = new Date(`${calendar[bestStart + 6].date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  return `${start} – ${end}`
}

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  setCommonHeaders(res, 's-maxage=900, stale-while-revalidate=1800')

  if (req.method && req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  if (!enforceRateLimit(req, res, { scope: 'route-intelligence', limit: 20, windowMs: 60_000 })) {
    return
  }

  try {
    const origin = readSingle(req.query?.origin).toUpperCase()
    const destination = readSingle(req.query?.destination).toUpperCase()
    const departureDate = readSingle(req.query?.departureDate)
    const tripType = readSingle(req.query?.tripType, 'round-trip')
    const returnDate = readSingle(req.query?.returnDate)

    validateIataCode(origin, 'Origin')
    validateIataCode(destination, 'Destination')
    validateDate(departureDate, 'Departure date')
    if (tripType === 'round-trip' && returnDate) {
      validateDate(returnDate, 'Return date')
    }
    validateTripType(tripType)

    const stayLength =
      tripType === 'round-trip' && departureDate && returnDate
        ? Math.max(
            1,
            Math.round(
              (new Date(`${returnDate}T12:00:00`).getTime() -
                new Date(`${departureDate}T12:00:00`).getTime()) /
                (24 * 60 * 60 * 1000),
            ),
          )
        : 4

    const dateRangeStart = addDays(departureDate, -3)
    const dateRangeEnd = addDays(departureDate, 84)
    const cacheKey = [
      'route-intel',
      origin,
      destination,
      departureDate,
      returnDate,
      tripType,
    ].join(':')

    const responsePayload = await withMemoryCache(cacheKey, 15 * 60 * 1000, async () => {
      const token = await fetchAmadeusToken()

      const [datesPayload, metricsPayload, destinationsPayload] = await Promise.all([
        fetchAmadeusJson<FlightDatesPayload>('/v1/shopping/flight-dates', token, {
          origin,
          destination,
          departureDate: `${dateRangeStart},${dateRangeEnd}`,
          oneWay: tripType === 'one-way',
          duration: tripType === 'round-trip' ? stayLength : undefined,
          currencyCode: 'USD',
        }),
        fetchAmadeusJson<PriceMetricsPayload>('/v1/analytics/itinerary-price-metrics', token, {
          originIataCode: origin,
          destinationIataCode: destination,
          departureDate,
          currencyCode: 'USD',
        }),
        fetchAmadeusJson<FlightDestinationsPayload>('/v1/shopping/flight-destinations', token, {
          origin,
          departureDate: `${departureDate},${addDays(departureDate, 45)}`,
          oneWay: tripType === 'one-way',
          duration: tripType === 'round-trip' ? stayLength : undefined,
          currencyCode: 'USD',
          maxPrice: 1200,
        }),
      ])

      const calendarRaw =
        datesPayload.data
          ?.map((item) => ({
            date: item.departureDate ?? '',
            price: priceValue(item.price?.total),
          }))
          .filter((item) => item.date && item.price > 0)
          .sort((left, right) => left.date.localeCompare(right.date)) ?? []

      const calendar = (() => {
        if (calendarRaw.length === 0) {
          return []
        }

        const min = Math.min(...calendarRaw.map((item) => item.price))
        const max = Math.max(...calendarRaw.map((item) => item.price))

        return calendarRaw.map((item) => ({
          date: item.date,
          price: item.price,
          valueScore:
            max === min ? 90 : Math.max(65, Math.min(98, Math.round(98 - ((item.price - min) / Math.max(1, max - min)) * 32))),
        }))
      })()

      const metrics = metricsPayload.data?.[0]?.priceMetrics ?? []
      const metricMap = new Map(
        metrics
          .filter((item) => item.quartileRanking && item.amount)
          .map((item) => [item.quartileRanking ?? '', priceValue(item.amount)]),
      )

      const minMetric = metricMap.get('MINIMUM') ?? Math.min(...calendar.map((item) => item.price), 0)
      const firstMetric = metricMap.get('FIRST') ?? minMetric
      const medianMetric = metricMap.get('MEDIUM') ?? average(calendar.map((item) => item.price))
      const thirdMetric = metricMap.get('THIRD') ?? medianMetric
      const maxMetric = metricMap.get('MAXIMUM') ?? Math.max(...calendar.map((item) => item.price), 0)

      const benchmarkHistory = [
        minMetric,
        firstMetric,
        firstMetric,
        medianMetric,
        medianMetric,
        thirdMetric,
        thirdMetric,
        maxMetric,
      ].filter((value): value is number => typeof value === 'number' && value > 0)

      const destinations = (destinationsPayload.data ?? []).slice(0, 6)
      const locationPayloads = await Promise.all(
        destinations.map((item) =>
          item.destination
            ? fetchAmadeusJson<LocationPayload>('/v1/reference-data/locations', token, {
                keyword: item.destination,
                subType: 'AIRPORT,CITY',
                'page[limit]': 1,
                view: 'LIGHT',
              }).catch(() => ({ data: [] }))
            : Promise.resolve({ data: [] }),
        ),
      )

      const destinationPoints = destinations
        .map((item, index) => {
          const location = locationPayloads[index].data?.[0]
          const latitude = location?.geoCode?.latitude
          const longitude = location?.geoCode?.longitude
          const projected =
            latitude !== undefined && longitude !== undefined
              ? projectPoint(latitude, longitude)
              : { x: 18 + index * 12, y: 18 + (index % 3) * 11 }

          return {
            airport: item.destination ?? '---',
            city: location?.address?.cityName ?? location?.name ?? item.destination ?? 'Unknown',
            x: projected.x,
            y: projected.y,
            price: priceValue(item.price?.total),
            valueTag: index === 0 ? 'Cheapest live option' : 'Live provider fare',
            summary: item.departureDate
              ? `Live fare sample for ${item.departureDate}${item.returnDate ? ` → ${item.returnDate}` : ''}`
              : 'Live destination inspiration pricing',
          }
        })
        .filter((item) => item.price > 0)

      return {
        calendar,
        cheapestWeek: calendar.length > 0 ? buildCheapestWeekLabel(calendar) : 'No live cheapest-week data',
        benchmark: benchmarkHistory.length > 0
          ? {
              low: minMetric,
              median: medianMetric,
              high: maxMetric,
              history: benchmarkHistory,
            }
          : null,
        destinationPoints,
        sources: {
          calendar: 'Amadeus Flight Dates',
          benchmark: 'Amadeus Itinerary Price Metrics',
          destinations: 'Amadeus Flight Destinations',
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
        source: 'amadeus.route-intelligence',
        cheapestPrice: responsePayload.benchmark.low,
        medianPrice: responsePayload.benchmark.median,
        sampleSize: responsePayload.calendar.length,
        metadata: {
          cheapestWeek: responsePayload.cheapestWeek,
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
