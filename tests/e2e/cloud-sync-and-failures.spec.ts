import { expect, test, type Page, type Route } from '@playwright/test'

function routeKeyFromRequest(route: Route) {
  const url = new URL(route.request().url())
  const origin = url.searchParams.get('origin') ?? 'DFW'
  const destination = url.searchParams.get('destination') ?? 'MIA'
  return `${origin}-${destination}`
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

function buildOffer(routeKey: string, airline: string, totalAmount: string) {
  const [origin, destination] = routeKey.split('-')

  return {
    id: `off_${origin.toLowerCase()}_${destination.toLowerCase()}_${airline.toLowerCase()}`,
    total_amount: totalAmount,
    owner: { name: airline, iata_code: airline.slice(0, 2).toUpperCase() },
    conditions: { refund_before_departure: { allowed: true } },
    slices: [
      {
        duration: 'PT4H20M',
        fare_brand_name: 'Main',
        segments: [
          {
            departing_at: '2026-05-20T08:10:00-05:00',
            arriving_at: '2026-05-20T12:30:00-04:00',
            origin: { iata_code: origin },
            destination: { iata_code: destination },
            operating_carrier: { name: airline, iata_code: airline.slice(0, 2).toUpperCase() },
            marketing_carrier: { name: airline, iata_code: airline.slice(0, 2).toUpperCase() },
            aircraft: { iata_code: '321', name: 'Airbus A321' },
            passengers: [{ baggages: [{ type: 'carry_on', quantity: 1 }] }],
          },
        ],
      },
    ],
  }
}

async function mockCommonApis(page: Page) {
  await page.route('**/api/route-intelligence**', async (route) => {
    await fulfillJson(route, {
      calendar: [],
      cheapestWeek: 'No live cheapest-week data',
      destinationPoints: [],
      sources: {},
    })
  })

  await page.route('**/api/airport-search**', async (route) => {
    await fulfillJson(route, { data: [] })
  })

  await page.route('**/api/health', async (route) => {
    await fulfillJson(route, {
      ok: true,
      environment: 'test',
      providers: {
        flightOffers: true,
        supabase: true,
      },
    })
  })

  await page.route('https://api.open-meteo.com/**', async (route) => {
    await fulfillJson(route, {
      current: {
        temperature_2m: 71,
        wind_speed_10m: 0,
        weather_code: 1,
      },
    })
  })
}

test('cloud sync restores the last search and recent search history', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('sb-demo-auth-token', JSON.stringify({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: {
        id: 'traveler-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'traveler@example.com',
        app_metadata: {
          provider: 'email',
          providers: ['email'],
        },
        user_metadata: {},
      },
    }))
    window.localStorage.setItem(
      'flight-tracker-pro:auth-state',
      JSON.stringify({
        status: 'authenticated',
        provider: 'local',
        user: {
          id: 'traveler-1',
          email: 'traveler@example.com',
        },
      }),
    )
  })

  await page.route('**/api/user-state', async (route) => {
    if (route.request().method() === 'GET') {
      await fulfillJson(route, {
        savedFlights: [],
        alertPreference: {
          priceDrops: true,
          directFlightAvailable: true,
          preferredAirlineDrop: true,
          nearlySoldOut: false,
        },
        savedSearch: {
          origin: 'JFK',
          destination: 'LAX',
          departureDate: '2026-05-20',
          returnDate: '2026-05-24',
          tripType: 'round-trip',
          travelers: 2,
          cabinClass: 'Business',
        },
        recentSearches: [
          {
            id: 'JFK:LAX:2026-05-20:2026-05-24:round-trip:2:Business',
            search: {
              origin: 'JFK',
              destination: 'LAX',
              departureDate: '2026-05-20',
              returnDate: '2026-05-24',
              tripType: 'round-trip',
              travelers: 2,
              cabinClass: 'Business',
            },
            lastViewedAt: '2026-04-17T14:00:00.000Z',
          },
          {
            id: 'DFW:DEN:2026-05-29:2026-06-01:round-trip:1:Economy',
            search: {
              origin: 'DFW',
              destination: 'DEN',
              departureDate: '2026-05-29',
              returnDate: '2026-06-01',
              tripType: 'round-trip',
              travelers: 1,
              cabinClass: 'Economy',
            },
            lastViewedAt: '2026-04-16T09:30:00.000Z',
          },
        ],
      })
      return
    }

    await fulfillJson(route, { ok: true })
  })

  await page.route('**/api/flight-offers**', async (route) => {
    const routeKey = routeKeyFromRequest(route)
    const offersByRoute: Record<string, unknown[]> = {
      'JFK-LAX': [buildOffer('JFK-LAX', 'Delta', '612.00')],
      'DFW-DEN': [buildOffer('DFW-DEN', 'United', '318.00')],
    }

    await fulfillJson(route, {
      data: offersByRoute[routeKey] ?? [],
    })
  })

  await mockCommonApis(page)
  await page.goto('/')

  await expect(page.getByTestId('results-summary')).toContainText('1 flights ranked for JFK to LAX')
  await expect(page.getByTestId('origin-input')).toHaveValue('JFK')
  await expect(page.getByTestId('destination-input')).toHaveValue('LAX')
  await expect(
    page.getByTestId('recent-search-JFK:LAX:2026-05-20:2026-05-24:round-trip:2:Business'),
  ).toBeVisible()
  await expect(
    page.getByTestId('recent-search-DFW:DEN:2026-05-29:2026-06-01:round-trip:1:Economy'),
  ).toBeVisible()

  await page.getByRole('button', { name: /DFW → DEN/i }).click()
  await expect(page.getByTestId('results-summary')).toContainText('1 flights ranked for DFW to DEN')
  await expect(page.getByTestId('origin-input')).toHaveValue('DFW')
  await expect(page.getByTestId('destination-input')).toHaveValue('DEN')
})

test('live provider failures surface a no-fares state without fake fallback inventory', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })

  await page.route('**/api/flight-offers**', async (route) => {
    await fulfillJson(route, { error: 'Provider unavailable' }, 500)
  })

  await mockCommonApis(page)
  await page.goto('/')

  await expect(page.getByTestId('results-summary')).toContainText('No live flights found for DFW to MIA')
  await expect(page.getByTestId('empty-results')).toBeVisible()
  await expect(page.getByText(/status 500/i).first()).toBeVisible()
  await expect(
    page.getByText(/No simulated fallback fares are being shown/i),
  ).toBeVisible()
})
