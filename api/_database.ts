import { createClient } from '@supabase/supabase-js'
import type { AlertPreference, RecentSearchEntry, SavedFlight, SearchState } from '../src/types.js'
import { logServerEvent, readSingle, type HandlerRequest } from './_http.js'

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

function getSupabaseUrl() {
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

export function getServiceSupabase() {
  const url = getSupabaseUrl()
  const serviceRoleKey = getServiceRoleKey()

  if (!url || !serviceRoleKey) {
    return null
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function requireAuthenticatedUser(req: HandlerRequest) {
  const token = readSingle(req.headers?.authorization).replace(/^Bearer\s+/i, '')
  if (!token) {
    return null
  }

  const client = getServiceSupabase()
  if (!client) {
    return null
  }

  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) {
    logServerEvent('warn', 'auth.invalid_token', {
      message: error?.message ?? 'Missing user in auth response.',
    })
    return null
  }

  return data.user
}

export async function loadUserState(userId: string) {
  const client = getServiceSupabase()
  if (!client) {
    return null
  }

  const [savedFlightsResponse, alertResponse, recentSearchesResponse] = await Promise.all([
    client
      .from('saved_flights')
      .select(
        'flight_id, template_id, route, airline, flight_number, cabin_class, saved_price, current_price, alerts',
      )
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    client
      .from('alert_preferences')
      .select(
        'price_drops, direct_flight_available, preferred_airline_drop, nearly_sold_out',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('saved_searches')
      .select('route_key, last_seen_at, search_payload')
      .eq('user_id', userId)
      .order('last_seen_at', { ascending: false })
      .limit(6),
  ])

  if (savedFlightsResponse.error) {
    throw savedFlightsResponse.error
  }

  if (alertResponse.error) {
    throw alertResponse.error
  }

  if (recentSearchesResponse.error) {
    throw recentSearchesResponse.error
  }

  const savedFlights: SavedFlight[] =
    savedFlightsResponse.data?.map((row) => ({
      id: row.flight_id,
      templateId: row.template_id,
      route: row.route,
      airline: row.airline,
      flightNumber: row.flight_number,
      cabinClass: row.cabin_class,
      savedPrice: row.saved_price,
      currentPrice: row.current_price,
      alerts: Array.isArray(row.alerts) ? (row.alerts as string[]) : [],
    })) ?? []

  const alertPreference: AlertPreference | undefined = alertResponse.data
    ? {
        priceDrops: alertResponse.data.price_drops,
        directFlightAvailable: alertResponse.data.direct_flight_available,
        preferredAirlineDrop: alertResponse.data.preferred_airline_drop,
        nearlySoldOut: alertResponse.data.nearly_sold_out,
      }
    : undefined

  const recentSearches: RecentSearchEntry[] =
    recentSearchesResponse.data
      ?.map((row) => {
        if (!row.search_payload || typeof row.search_payload !== 'object') {
          return null
        }

        return {
          id: row.route_key,
          search: row.search_payload as SearchState,
          lastViewedAt: row.last_seen_at,
        } satisfies RecentSearchEntry
      })
      .filter((entry): entry is RecentSearchEntry => Boolean(entry)) ?? []

  const savedSearch = recentSearches[0]?.search

  return {
    savedFlights,
    alertPreference,
    savedSearch,
    recentSearches,
  }
}

export async function saveUserState(
  userId: string,
  payload: {
    savedFlights?: SavedFlight[]
    alertPreference?: AlertPreference
    savedSearch?: SearchState
  },
) {
  const client = getServiceSupabase()
  if (!client) {
    return
  }

  const profileWrite = await client.from('user_profiles').upsert(
    {
      user_id: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (profileWrite.error) {
    throw profileWrite.error
  }

  if (payload.savedFlights) {
    const deleteSavedFlights = await client.from('saved_flights').delete().eq('user_id', userId)
    if (deleteSavedFlights.error) {
      throw deleteSavedFlights.error
    }

    if (payload.savedFlights.length > 0) {
      const insertSavedFlights = await client.from('saved_flights').insert(
        payload.savedFlights.map((flight) => ({
          user_id: userId,
          flight_id: flight.id,
          template_id: flight.templateId,
          route: flight.route,
          airline: flight.airline,
          flight_number: flight.flightNumber,
          cabin_class: flight.cabinClass,
          saved_price: flight.savedPrice,
          current_price: flight.currentPrice,
          alerts: flight.alerts,
          updated_at: new Date().toISOString(),
        })),
      )

      if (insertSavedFlights.error) {
        throw insertSavedFlights.error
      }
    }
  }

  if (payload.alertPreference) {
    const alertWrite = await client.from('alert_preferences').upsert(
      {
        user_id: userId,
        price_drops: payload.alertPreference.priceDrops,
        direct_flight_available: payload.alertPreference.directFlightAvailable,
        preferred_airline_drop: payload.alertPreference.preferredAirlineDrop,
        nearly_sold_out: payload.alertPreference.nearlySoldOut,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

    if (alertWrite.error) {
      throw alertWrite.error
    }
  }

  if (payload.savedSearch) {
    const routeKey = `${payload.savedSearch.origin}-${payload.savedSearch.destination}-${payload.savedSearch.departureDate}`
    const searchWrite = await client.from('saved_searches').upsert(
      {
        user_id: userId,
        route_key: routeKey,
        origin: payload.savedSearch.origin,
        destination: payload.savedSearch.destination,
        departure_date: payload.savedSearch.departureDate,
        return_date: payload.savedSearch.tripType === 'round-trip' ? payload.savedSearch.returnDate : null,
        trip_type: payload.savedSearch.tripType,
        travelers: payload.savedSearch.travelers,
        cabin_class: payload.savedSearch.cabinClass,
        search_payload: payload.savedSearch as unknown as JsonValue,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,route_key' },
    )

    if (searchWrite.error) {
      throw searchWrite.error
    }
  }
}

export async function recordFareSnapshot(payload: {
  routeKey: string
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  tripType: string
  source: string
  cheapestPrice: number
  medianPrice?: number
  sampleSize: number
  metadata?: JsonValue
}) {
  const client = getServiceSupabase()
  if (!client) {
    return
  }

  const { error } = await client.from('fare_snapshots').insert({
    route_key: payload.routeKey,
    origin: payload.origin,
    destination: payload.destination,
    departure_date: payload.departureDate,
    return_date: payload.returnDate ?? null,
    trip_type: payload.tripType,
    source: payload.source,
    cheapest_price: payload.cheapestPrice,
    median_price: payload.medianPrice ?? payload.cheapestPrice,
    sample_size: payload.sampleSize,
    metadata: payload.metadata ?? null,
  })

  if (error) {
    throw error
  }
}

export async function recordUsageEvent(payload: {
  eventType: string
  level: string
  pathname?: string
  context?: JsonValue
}) {
  const client = getServiceSupabase()
  if (!client) {
    return
  }

  const { error } = await client.from('usage_events').insert({
    event_type: payload.eventType,
    level: payload.level,
    pathname: payload.pathname ?? null,
    context: payload.context ?? null,
  })

  if (error) {
    throw error
  }
}
