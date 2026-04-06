import { expect, test, type Page, type Route } from '@playwright/test'

type MockOffer = {
  id: string
  total_amount: string
  owner?: { name?: string; iata_code?: string }
  conditions?: { refund_before_departure?: { allowed?: boolean } }
  slices: Array<{
    duration: string
    fare_brand_name?: string
    segments: Array<{
      departing_at: string
      arriving_at: string
      origin_terminal?: string
      destination_terminal?: string
      origin: { iata_code: string }
      destination: { iata_code: string }
      operating_carrier: { name: string; iata_code: string }
      marketing_carrier: { name: string; iata_code: string }
      aircraft?: { iata_code?: string; name?: string }
      passengers?: Array<{
        baggages?: Array<{ type?: string; quantity?: number }>
      }>
    }>
  }>
}

function baggages(type: string, quantity: number) {
  return [{ baggages: [{ type, quantity }] }]
}

const offerFixtures: Record<string, MockOffer[]> = {
  'DFW-MIA': [
    {
      id: 'off_dfw_mia_delta_direct',
      total_amount: '378.00',
      owner: { name: 'Delta', iata_code: 'DL' },
      conditions: { refund_before_departure: { allowed: false } },
      slices: [
        {
          duration: 'PT3H10M',
          fare_brand_name: 'Main',
          segments: [
            {
              departing_at: '2026-05-20T08:10:00-05:00',
              arriving_at: '2026-05-20T12:20:00-04:00',
              origin_terminal: 'E',
              destination_terminal: 'S',
              origin: { iata_code: 'DFW' },
              destination: { iata_code: 'MIA' },
              operating_carrier: { name: 'Delta', iata_code: 'DL' },
              marketing_carrier: { name: 'Delta', iata_code: 'DL' },
              aircraft: { iata_code: '738', name: 'Boeing 737-800' },
              passengers: baggages('carry_on', 1),
            },
          ],
        },
      ],
    },
    {
      id: 'off_dfw_mia_united_stop',
      total_amount: '442.00',
      owner: { name: 'United', iata_code: 'UA' },
      conditions: { refund_before_departure: { allowed: false } },
      slices: [
        {
          duration: 'PT5H45M',
          fare_brand_name: 'Standard',
          segments: [
            {
              departing_at: '2026-05-20T09:00:00-05:00',
              arriving_at: '2026-05-20T11:10:00-05:00',
              origin: { iata_code: 'DFW' },
              destination: { iata_code: 'IAH' },
              operating_carrier: { name: 'United', iata_code: 'UA' },
              marketing_carrier: { name: 'United', iata_code: 'UA' },
              aircraft: { iata_code: '739', name: 'Boeing 737-900' },
              passengers: baggages('carry_on', 1),
            },
            {
              departing_at: '2026-05-20T12:20:00-05:00',
              arriving_at: '2026-05-20T15:45:00-04:00',
              origin: { iata_code: 'IAH' },
              destination: { iata_code: 'MIA' },
              operating_carrier: { name: 'United', iata_code: 'UA' },
              marketing_carrier: { name: 'United', iata_code: 'UA' },
              aircraft: { iata_code: '739', name: 'Boeing 737-900' },
              passengers: baggages('carry_on', 1),
            },
          ],
        },
      ],
    },
    {
      id: 'off_dfw_mia_american_direct',
      total_amount: '518.00',
      owner: { name: 'American', iata_code: 'AA' },
      conditions: { refund_before_departure: { allowed: true } },
      slices: [
        {
          duration: 'PT3H05M',
          fare_brand_name: 'Flex',
          segments: [
            {
              departing_at: '2026-05-20T14:10:00-05:00',
              arriving_at: '2026-05-20T18:15:00-04:00',
              origin_terminal: 'A',
              destination_terminal: 'D',
              origin: { iata_code: 'DFW' },
              destination: { iata_code: 'MIA' },
              operating_carrier: { name: 'American', iata_code: 'AA' },
              marketing_carrier: { name: 'American', iata_code: 'AA' },
              aircraft: { iata_code: '321', name: 'Airbus A321' },
              passengers: [{ baggages: [{ type: 'carry_on', quantity: 1 }, { type: 'checked', quantity: 1 }] }],
            },
          ],
        },
      ],
    },
    {
      id: 'off_dfw_mia_jetblue_overnight',
      total_amount: '488.00',
      owner: { name: 'JetBlue', iata_code: 'B6' },
      conditions: { refund_before_departure: { allowed: false } },
      slices: [
        {
          duration: 'PT6H30M',
          fare_brand_name: 'Blue',
          segments: [
            {
              departing_at: '2026-05-20T19:00:00-05:00',
              arriving_at: '2026-05-20T22:05:00-05:00',
              origin: { iata_code: 'DFW' },
              destination: { iata_code: 'FLL' },
              operating_carrier: { name: 'JetBlue', iata_code: 'B6' },
              marketing_carrier: { name: 'JetBlue', iata_code: 'B6' },
              aircraft: { iata_code: '320', name: 'Airbus A320' },
              passengers: baggages('carry_on', 1),
            },
            {
              departing_at: '2026-05-20T23:20:00-05:00',
              arriving_at: '2026-05-21T01:30:00-04:00',
              origin: { iata_code: 'FLL' },
              destination: { iata_code: 'MIA' },
              operating_carrier: { name: 'JetBlue', iata_code: 'B6' },
              marketing_carrier: { name: 'JetBlue', iata_code: 'B6' },
              aircraft: { iata_code: '320', name: 'Airbus A320' },
              passengers: baggages('carry_on', 1),
            },
          ],
        },
      ],
    },
  ],
  'DFW-STT': [
    {
      id: 'off_dfw_stt_american_one_stop',
      total_amount: '824.00',
      owner: { name: 'American', iata_code: 'AA' },
      conditions: { refund_before_departure: { allowed: false } },
      slices: [
        {
          duration: 'PT7H15M',
          fare_brand_name: 'Main',
          segments: [
            {
              departing_at: '2026-05-20T07:15:00-05:00',
              arriving_at: '2026-05-20T11:00:00-04:00',
              origin: { iata_code: 'DFW' },
              destination: { iata_code: 'MIA' },
              operating_carrier: { name: 'American', iata_code: 'AA' },
              marketing_carrier: { name: 'American', iata_code: 'AA' },
              passengers: baggages('carry_on', 1),
            },
            {
              departing_at: '2026-05-20T12:05:00-04:00',
              arriving_at: '2026-05-20T15:30:00-04:00',
              origin: { iata_code: 'MIA' },
              destination: { iata_code: 'STT' },
              operating_carrier: { name: 'American', iata_code: 'AA' },
              marketing_carrier: { name: 'American', iata_code: 'AA' },
              passengers: baggages('carry_on', 1),
            },
          ],
        },
      ],
    },
    {
      id: 'off_dfw_stt_delta_one_stop',
      total_amount: '876.00',
      owner: { name: 'Delta', iata_code: 'DL' },
      conditions: { refund_before_departure: { allowed: true } },
      slices: [
        {
          duration: 'PT8H05M',
          fare_brand_name: 'Comfort',
          segments: [
            {
              departing_at: '2026-05-20T08:25:00-05:00',
              arriving_at: '2026-05-20T12:10:00-04:00',
              origin: { iata_code: 'DFW' },
              destination: { iata_code: 'ATL' },
              operating_carrier: { name: 'Delta', iata_code: 'DL' },
              marketing_carrier: { name: 'Delta', iata_code: 'DL' },
              passengers: [{ baggages: [{ type: 'carry_on', quantity: 1 }, { type: 'checked', quantity: 1 }] }],
            },
            {
              departing_at: '2026-05-20T13:40:00-04:00',
              arriving_at: '2026-05-20T17:30:00-04:00',
              origin: { iata_code: 'ATL' },
              destination: { iata_code: 'STT' },
              operating_carrier: { name: 'Delta', iata_code: 'DL' },
              marketing_carrier: { name: 'Delta', iata_code: 'DL' },
              passengers: [{ baggages: [{ type: 'carry_on', quantity: 1 }, { type: 'checked', quantity: 1 }] }],
            },
          ],
        },
      ],
    },
    {
      id: 'off_dfw_stt_united_two_stop',
      total_amount: '778.00',
      owner: { name: 'United', iata_code: 'UA' },
      conditions: { refund_before_departure: { allowed: false } },
      slices: [
        {
          duration: 'PT10H45M',
          fare_brand_name: 'Standard',
          segments: [
            {
              departing_at: '2026-05-20T06:10:00-05:00',
              arriving_at: '2026-05-20T08:35:00-05:00',
              origin: { iata_code: 'DFW' },
              destination: { iata_code: 'IAH' },
              operating_carrier: { name: 'United', iata_code: 'UA' },
              marketing_carrier: { name: 'United', iata_code: 'UA' },
              passengers: baggages('carry_on', 1),
            },
            {
              departing_at: '2026-05-20T09:30:00-05:00',
              arriving_at: '2026-05-20T13:10:00-04:00',
              origin: { iata_code: 'IAH' },
              destination: { iata_code: 'MIA' },
              operating_carrier: { name: 'United', iata_code: 'UA' },
              marketing_carrier: { name: 'United', iata_code: 'UA' },
              passengers: baggages('carry_on', 1),
            },
            {
              departing_at: '2026-05-20T14:15:00-04:00',
              arriving_at: '2026-05-20T16:55:00-04:00',
              origin: { iata_code: 'MIA' },
              destination: { iata_code: 'STT' },
              operating_carrier: { name: 'United', iata_code: 'UA' },
              marketing_carrier: { name: 'United', iata_code: 'UA' },
              passengers: baggages('carry_on', 1),
            },
          ],
        },
      ],
    },
  ],
}

function routeKeyFromRequest(route: Route) {
  const url = new URL(route.request().url())
  const origin = url.searchParams.get('origin') ?? ''
  const destination = url.searchParams.get('destination') ?? ''
  return `${origin}-${destination}`
}

async function fulfillJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

async function mockLiveApis(page: Page) {
  await page.route('**/api/flight-offers**', async (route) => {
    const routeKey = routeKeyFromRequest(route)
    await fulfillJson(route, {
      data: offerFixtures[routeKey] ?? [],
      liveMode: true,
      source: 'Playwright live fixture',
    })
  })

  await page.route('**/api/route-intelligence**', async (route) => {
    const routeKey = routeKeyFromRequest(route)
    const baseCalendar =
      routeKey === 'DFW-STT'
        ? [
            { date: '2026-05-20', price: 389, valueScore: 96 },
            { date: '2026-05-23', price: 412, valueScore: 89 },
          ]
        : [
            { date: '2026-05-20', price: 189, valueScore: 97 },
            { date: '2026-05-23', price: 205, valueScore: 90 },
          ]

    await fulfillJson(route, {
      calendar: baseCalendar,
      cheapestWeek: 'May 20 sample window',
      benchmark: {
        low: baseCalendar[0].price,
        median: baseCalendar[1].price,
        high: baseCalendar[1].price + 20,
        history: [baseCalendar[0].price, baseCalendar[1].price, baseCalendar[1].price + 20],
      },
      destinationPoints: [],
      sources: {
        calendar: 'Playwright live fixture',
        benchmark: 'Playwright live fixture',
        destinations: 'Playwright live fixture',
      },
    })
  })

  await page.route('**/api/airport-search**', async (route) => {
    await fulfillJson(route, { data: [] })
  })

  await page.route('https://api.open-meteo.com/**', async (route) => {
    await fulfillJson(route, {
      current: {
        temperature_2m: 82,
        wind_speed_10m: 11,
        weather_code: 1,
      },
    })
  })
}

async function gotoApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })

  await mockLiveApis(page)
  await page.goto('/')
  await expect(page.getByTestId('results-summary')).toContainText('4 flights ranked for DFW to MIA')
  await expect(page.getByTestId('flight-card')).toHaveCount(4)
}

async function changeRoute(page: Page, origin: string, destination: string, expectedCount: number) {
  await page.getByTestId('origin-input').fill(origin)
  await page.getByTestId('destination-input').fill(destination)
  await page.getByTestId('search-submit').click()
  await expect(page.getByTestId('results-summary')).toContainText(
    `${expectedCount} flights ranked for ${origin} to ${destination}`,
  )
  await expect(page.getByTestId('flight-card')).toHaveCount(expectedCount)
}

test.describe('filter interactions', () => {
  test.beforeEach(async ({ page }) => {
    await gotoApp(page)
  })

  test('checkbox filters update results for the default route', async ({ page }) => {
    await page.getByLabel('Direct flights only').check()
    await expect(page.getByTestId('flight-card')).toHaveCount(2)
    await expect(page.locator('[data-testid="flight-card"][data-stops="0"]')).toHaveCount(2)

    await page.getByLabel('Direct flights only').uncheck()
    await expect(page.getByTestId('flight-card')).toHaveCount(4)

    await page.getByLabel('Refundable only').check()
    await expect(page.getByTestId('flight-card')).toHaveCount(1)
    await expect(page.locator('[data-testid="flight-card"][data-refundable="true"]')).toHaveCount(1)

    await page.getByLabel('Refundable only').uncheck()
    await expect(page.getByTestId('flight-card')).toHaveCount(4)

    await page.getByLabel('Bags included only').check()
    await expect(page.getByTestId('flight-card')).toHaveCount(1)
    await expect(page.locator('[data-testid="flight-card"][data-checked-bag="true"]')).toHaveCount(1)
  })

  test('time-window chips narrow results on a known route', async ({ page }) => {
    await page.getByRole('button', { name: 'Morning', exact: true }).nth(0).click()
    await expect(page.getByTestId('flight-card')).toHaveCount(2)

    await page.getByRole('button', { name: 'Morning', exact: true }).nth(0).click()
    await expect(page.getByTestId('flight-card')).toHaveCount(4)

    await page.getByRole('button', { name: 'Overnight', exact: true }).nth(1).click()
    await expect(page.getByTestId('flight-card')).toHaveCount(1)
  })

  test('preferred and excluded airline chips work', async ({ page }) => {
    await page.getByRole('button', { name: 'Delta', exact: true }).nth(0).click()
    await expect(page.getByTestId('flight-card')).toHaveCount(1)
    await expect(page.locator('[data-testid="flight-card"][data-airline="Delta"]')).toHaveCount(1)

    await page.getByRole('button', { name: 'Delta', exact: true }).nth(0).click()
    await expect(page.getByTestId('flight-card')).toHaveCount(4)

    await page.getByRole('button', { name: 'Delta', exact: true }).nth(1).click()
    await expect(page.getByTestId('flight-card')).toHaveCount(3)
    await expect(page.locator('[data-testid="flight-card"][data-airline="Delta"]')).toHaveCount(0)
  })

  test('layover and duration controls reduce longer itineraries', async ({ page }) => {
    await changeRoute(page, 'DFW', 'STT', 3)

    await page.getByRole('button', { name: 'Maximum 1 stop' }).click()
    await expect(page.getByTestId('flight-card')).toHaveCount(2)

    await page.getByTestId('duration-range').focus()
    await page.getByTestId('duration-range').press('Home')

    await expect(page.getByTestId('flight-card')).toHaveCount(0)
    await expect(page.getByTestId('empty-results')).toBeVisible()
  })

  test('price sliders can be modified and narrow the result set', async ({ page }) => {
    await page.getByTestId('price-max-range').evaluate((element) => {
      const input = element as HTMLInputElement
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(input, '120')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    await expect(page.getByTestId('flight-card')).toHaveCount(0)
    await expect(page.getByTestId('empty-results')).toBeVisible()
  })
})
