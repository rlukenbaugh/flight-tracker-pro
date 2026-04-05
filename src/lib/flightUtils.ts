import type {
  CabinClass,
  FilterState,
  FlightResult,
  FlightTemplate,
  RouteInsight,
  SearchState,
  SortMode,
  TimeBucket,
} from '../types'

const cabinPolicies: Record<
  CabinClass,
  {
    multiplier: number
    carryOnIncluded: boolean
    checkedBagIncluded: boolean
    refundableBonus: boolean
    bagFee: number
  }
> = {
  Economy: {
    multiplier: 1,
    carryOnIncluded: true,
    checkedBagIncluded: false,
    refundableBonus: false,
    bagFee: 38,
  },
  'Premium Economy': {
    multiplier: 1.34,
    carryOnIncluded: true,
    checkedBagIncluded: true,
    refundableBonus: true,
    bagFee: 0,
  },
  Business: {
    multiplier: 2.35,
    carryOnIncluded: true,
    checkedBagIncluded: true,
    refundableBonus: true,
    bagFee: 0,
  },
  First: {
    multiplier: 3.12,
    carryOnIncluded: true,
    checkedBagIncluded: true,
    refundableBonus: true,
    bagFee: 0,
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function normalizeInverse(value: number, min: number, max: number) {
  if (max === min) {
    return 100
  }

  return 100 - ((value - min) / (max - min)) * 100
}

function getPriceMultiplier(search: SearchState, insight?: RouteInsight, flexDays = 0) {
  const cabinMultiplier = cabinPolicies[search.cabinClass].multiplier
  const tripMultiplier = search.tripType === 'round-trip' ? 1.84 : 1
  const flexEffect = search.tripType === 'round-trip' ? 0.97 : 1
  const trendEffect =
    insight?.direction === 'rising' ? 1.04 : insight?.direction === 'falling' ? 0.98 : 1
  const targetDate = new Date(`${search.departureDate}T12:00:00`)
  const selectedDatePrice = insight
    ? Math.min(
        ...insight.calendar
          .filter((day) => {
            const dayDate = new Date(`${day.date}T12:00:00`)
            const delta = Math.abs(dayDate.getTime() - targetDate.getTime()) / (24 * 60 * 60 * 1000)
            return delta <= flexDays
          })
          .map((day) => day.price),
      )
    : undefined
  const dateEffect =
    insight && selectedDatePrice
      ? clamp(selectedDatePrice / insight.recentAverage, 0.82, 1.18)
      : 1

  return cabinMultiplier * tripMultiplier * flexEffect * trendEffect * dateEffect
}

function buildWarnings(template: FlightTemplate, cabinClass: CabinClass) {
  const warnings: string[] = []

  if (template.layoverMinutes.some((minutes) => minutes < 50)) {
    warnings.push(
      `This flight includes a ${Math.min(...template.layoverMinutes)}-minute layover in ${template.layovers[0]}. Risky.`,
    )
  }

  if (template.overnightLayover) {
    warnings.push('Late connection creates a fatigue-heavy overnight arrival.')
  }

  if (template.regionalAircraft) {
    warnings.push('Regional aircraft on part of this trip means tighter bins and seating.')
  }

  if (template.delayRisk !== 'Low') {
    warnings.push(`Likely delay risk is ${template.delayRisk.toLowerCase()} on this routing.`)
  }

  if (cabinClass === 'Economy' && template.seatComfort === 'tight') {
    warnings.push('Seat comfort looks below average for this duration.')
  }

  return warnings
}

function buildSeatInsight(template: FlightTemplate, cabinClass: CabinClass) {
  if (cabinClass === 'Business' || cabinClass === 'First') {
    return 'Premium cabin sharply reduces seat and connection fatigue on this routing.'
  }

  if (template.seatComfort === 'spacious') {
    return 'Seat profile is above average for this market.'
  }

  if (template.seatComfort === 'tight') {
    return 'Expect a tighter seating layout than the top-scoring alternatives.'
  }

  return 'Seat quality is typical for this route.'
}

export function createFlightResults(
  templates: FlightTemplate[],
  search: SearchState,
  insight?: RouteInsight,
  flexDays = 0,
) {
  const multiplier = getPriceMultiplier(search, insight, flexDays)

  const priced = templates.map((template) => {
    const policy = cabinPolicies[search.cabinClass]
    const perTraveler = Math.round(template.baseFare * multiplier)
    const totalPrice = perTraveler * search.travelers
    const refundable =
      policy.refundableBonus || template.fareProfile === 'Flex' || search.cabinClass === 'First'
    const checkedBagIncluded =
      policy.checkedBagIncluded || template.airline === 'Southwest' || template.fareProfile === 'Flex'
    const estimatedBagFees = checkedBagIncluded ? 0 : policy.bagFee * search.travelers
    const estimatedExtras = template.extrasEstimate * search.travelers
    const totalEstimatedTripCost = totalPrice + estimatedBagFees + estimatedExtras

    return {
      id: `${template.id}-${search.cabinClass}-${search.tripType}`,
      templateId: template.id,
      origin: template.origin,
      destination: template.destination,
      airline: template.airline,
      flightNumber: template.flightNumber,
      departureTime: template.departureTime,
      arrivalTime: template.arrivalTime,
      totalMinutes: template.totalMinutes,
      stops: template.stops,
      layovers: template.layovers,
      layoverMinutes: template.layoverMinutes,
      cabinClass: search.cabinClass,
      totalPrice,
      pricePerTraveler: perTraveler,
      refundable,
      carryOnIncluded: policy.carryOnIncluded,
      checkedBagIncluded,
      airlineQuality: template.airlineQuality,
      delayRisk: template.delayRisk,
      aircraft: template.aircraft,
      regionalAircraft: template.regionalAircraft,
      terminalNote: template.terminalNote,
      estimatedBagFees,
      estimatedExtras,
      totalEstimatedTripCost,
      warnings: buildWarnings(template, search.cabinClass),
      seatInsight: buildSeatInsight(template, search.cabinClass),
      fareProfile: template.fareProfile,
      score: 0,
      dealLabel: '🟡 Fair' as const,
    } satisfies FlightResult
  })

  const priceMin = Math.min(...priced.map((flight) => flight.pricePerTraveler))
  const priceMax = Math.max(...priced.map((flight) => flight.pricePerTraveler))
  const durationMin = Math.min(...priced.map((flight) => flight.totalMinutes))
  const durationMax = Math.max(...priced.map((flight) => flight.totalMinutes))
  const stopMin = Math.min(...priced.map((flight) => flight.stops))
  const stopMax = Math.max(...priced.map((flight) => flight.stops))

  return priced.map((flight) => {
    const priceScore = normalizeInverse(flight.pricePerTraveler, priceMin, priceMax)
    const durationScore = normalizeInverse(flight.totalMinutes, durationMin, durationMax)
    const stopScore = normalizeInverse(flight.stops, stopMin, stopMax)
    const airlineScore = flight.airlineQuality * 10
    const warningPenalty = Math.min(14, flight.warnings.length * 4)
    const score = Math.round(
      clamp(
        priceScore * 0.4 + durationScore * 0.25 + stopScore * 0.2 + airlineScore * 0.15 - warningPenalty,
        0,
        100,
      ),
    )
    const dealLabel: FlightResult['dealLabel'] =
      score >= 80 ? '🟢 Excellent Deal' : score >= 62 ? '🟡 Fair' : '🔴 Overpriced'

    return {
      ...flight,
      score,
      dealLabel,
    }
  })
}

export function getTimeBucket(time: string): TimeBucket {
  const minutes = toMinutes(time)

  if (minutes < 300) {
    return 'overnight'
  }

  if (minutes < 480) {
    return 'early-morning'
  }

  if (minutes < 720) {
    return 'morning'
  }

  if (minutes < 1020) {
    return 'afternoon'
  }

  if (minutes < 1320) {
    return 'evening'
  }

  return 'overnight'
}

export function filterFlights(flights: FlightResult[], filters: FilterState) {
  return flights.filter((flight) => {
    const departureBucket = getTimeBucket(flight.departureTime)
    const arrivalBucket = getTimeBucket(flight.arrivalTime)
    const airlinePreferred =
      filters.preferredAirlines.length === 0 || filters.preferredAirlines.includes(flight.airline)
    const airlineExcluded = filters.excludedAirlines.includes(flight.airline)
    const departureAllowed =
      filters.departureWindows.length === 0 || filters.departureWindows.includes(departureBucket)
    const arrivalAllowed =
      filters.arrivalWindows.length === 0 || filters.arrivalWindows.includes(arrivalBucket)

    if (filters.directOnly && flight.stops > 0) {
      return false
    }

    if (flight.stops > filters.maxStops) {
      return false
    }

    if (!airlinePreferred || airlineExcluded) {
      return false
    }

    if (!departureAllowed || !arrivalAllowed) {
      return false
    }

    if (flight.totalMinutes > filters.maxDuration) {
      return false
    }

    if (flight.pricePerTraveler < filters.priceMin || flight.pricePerTraveler > filters.priceMax) {
      return false
    }

    if (filters.refundableOnly && !flight.refundable) {
      return false
    }

    if (filters.bagsIncludedOnly && !flight.checkedBagIncluded) {
      return false
    }

    return true
  })
}

export function sortFlights(flights: FlightResult[], mode: SortMode) {
  return [...flights].sort((left, right) => {
    switch (mode) {
      case 'cheapest':
        return left.totalPrice - right.totalPrice
      case 'fastest':
        return left.totalMinutes - right.totalMinutes
      case 'fewest-layovers':
        return left.stops - right.stops || left.totalMinutes - right.totalMinutes
      case 'airline-quality':
        return right.airlineQuality - left.airlineQuality
      case 'earliest-departure':
        return toMinutes(left.departureTime) - toMinutes(right.departureTime)
      case 'latest-departure':
        return toMinutes(right.departureTime) - toMinutes(left.departureTime)
      case 'best-value':
      default:
        return right.score - left.score || left.totalPrice - right.totalPrice
    }
  })
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}h ${minutes}m`
}

export function formatStops(stops: number) {
  if (stops === 0) {
    return 'Direct'
  }

  return `${stops} stop${stops > 1 ? 's' : ''}`
}

export function buildRouteRecommendation(insight: RouteInsight | undefined, bestFlight: FlightResult | undefined) {
  if (!insight || !bestFlight) {
    return 'Search a supported route to unlock booking guidance and trend context.'
  }

  const deltaFromAverage = Math.round(
    ((bestFlight.pricePerTraveler - insight.recentAverage) / insight.recentAverage) * 100,
  )

  if (insight.direction === 'falling' && deltaFromAverage > 6) {
    return `${insight.buyRecommendation} This fare is ${deltaFromAverage}% above the recent average.`
  }

  if (insight.direction === 'rising' && deltaFromAverage <= 3) {
    return `Book now if this route and time work for you. Current pricing is still competitive against recent history.`
  }

  if (bestFlight.score >= 82) {
    return `This is a strong fare compared with recent trends. ${insight.historicalTip}`
  }

  return `${insight.buyRecommendation} ${insight.historicalTip}`
}

export function getRouteKey(origin: string, destination: string) {
  return `${origin}-${destination}`
}

export function buildDefaultFilters() {
  return {
    directOnly: false,
    maxStops: 2 as const,
    preferredAirlines: [],
    excludedAirlines: [],
    departureWindows: [],
    arrivalWindows: [],
    maxDuration: 900,
    priceMin: 80,
    priceMax: 2200,
    flexDays: 3 as const,
    refundableOnly: false,
    bagsIncludedOnly: false,
  }
}
