import { expect, test, type Page } from '@playwright/test'

async function gotoApp(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })

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
    await page.getByTestId('price-max-range').focus()
    await page.getByTestId('price-max-range').press('Home')

    await expect(page.getByTestId('flight-card')).toHaveCount(0)
    await expect(page.getByTestId('empty-results')).toBeVisible()
  })
})
