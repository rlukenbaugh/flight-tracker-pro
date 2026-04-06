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
  validateTravelerCount,
  validateTripType,
  withMemoryCache,
  type HandlerRequest,
  type HandlerResponse,
} from './_http.js'

const allowedCabinClasses = new Set(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  setCommonHeaders(res, 's-maxage=300, stale-while-revalidate=600')

  if (req.method && req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  if (!enforceRateLimit(req, res, { scope: 'flight-offers', limit: 20, windowMs: 60_000 })) {
    return
  }

  try {
    const origin = readSingle(req.query?.origin).toUpperCase()
    const destination = readSingle(req.query?.destination).toUpperCase()
    const departureDate = readSingle(req.query?.departureDate)
    const returnDate = readSingle(req.query?.returnDate)
    const tripType = readSingle(req.query?.tripType, 'round-trip')
    const travelers = Number(readSingle(req.query?.travelers, '1'))
    const cabinClass = readSingle(req.query?.cabinClass, 'ECONOMY').toUpperCase()

    validateIataCode(origin, 'Origin')
    validateIataCode(destination, 'Destination')
    validateDate(departureDate, 'Departure date')
    if (tripType === 'round-trip' && returnDate) {
      validateDate(returnDate, 'Return date')
    }
    validateTripType(tripType)
    validateTravelerCount(travelers)
    if (!allowedCabinClasses.has(cabinClass.replace(' ', '_'))) {
      throw new Error('Cabin class is not supported.')
    }

    const cacheKey = [
      'flight-offers',
      origin,
      destination,
      departureDate,
      returnDate,
      tripType,
      travelers,
      cabinClass,
    ].join(':')

    const payload = await withMemoryCache(cacheKey, 5 * 60 * 1000, async () => {
      const token = await fetchAmadeusToken()
      return fetchAmadeusJson('/v2/shopping/flight-offers', token, {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate,
        adults: String(travelers),
        travelClass: cabinClass.replace(' ', '_'),
        currencyCode: 'USD',
        max: '12',
        returnDate: tripType === 'round-trip' && returnDate ? returnDate : undefined,
      })
    })

    const offers = ((payload as { data?: Array<{ price?: { grandTotal?: string } }> }).data ?? [])
      .map((offer) => Number(offer.price?.grandTotal ?? 0))
      .filter((price) => Number.isFinite(price) && price > 0)
      .sort((left, right) => left - right)

    if (offers.length > 0) {
      const midIndex = Math.floor(offers.length / 2)
      void recordFareSnapshot({
        routeKey: `${origin}-${destination}`,
        origin,
        destination,
        departureDate,
        returnDate: tripType === 'round-trip' ? returnDate : undefined,
        tripType,
        source: 'amadeus.flight-offers',
        cheapestPrice: Math.round(offers[0]),
        medianPrice: Math.round(offers[midIndex]),
        sampleSize: offers.length,
        metadata: {
          travelers,
          cabinClass,
        },
      }).catch((error) => {
        logServerEvent('warn', 'fare_snapshot.write_failed', {
          routeKey: `${origin}-${destination}`,
          message: error instanceof Error ? error.message : 'Unknown fare snapshot failure.',
        })
      })
    }

    logServerEvent('info', 'flight_offers.success', {
      routeKey: `${origin}-${destination}`,
      tripType,
      travelers,
      resultCount: offers.length,
    })

    json(res, 200, payload)
  } catch (error) {
    logServerEvent('error', 'flight_offers.failure', {
      message: error instanceof Error ? error.message : 'Unexpected live flight failure.',
    })
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Unexpected live flight failure.',
    })
  }
}
