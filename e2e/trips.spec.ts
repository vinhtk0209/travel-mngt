import { expect, test } from '@playwright/test'
import { createTestUser } from './support/admin'
import { createTripViaUi, loginAs, uniqueName } from './support/ui'

test.describe('trips', () => {
  test('creates, searches and opens a trip', async ({ page }) => {
    const user = await createTestUser('trips')
    const tripName = uniqueName('Da Lat escape')

    await loginAs(page, user)
    const tripPath = await createTripViaUi(page, {
      name: tripName,
      destination: 'Da Lat, Vietnam',
      description: 'Coffee, waterfalls and no alarms.',
    })

    await expect(page.getByRole('link').filter({ hasText: tripName })).toBeVisible()

    await page.getByLabel('Search trips').fill(tripName)
    await expect(page.getByRole('link').filter({ hasText: tripName })).toBeVisible()

    await page.getByLabel('Search trips').fill('a search with no matches')
    await expect(page.getByText('No trips match that search')).toBeVisible()
    await page.getByRole('button', { name: 'Clear search' }).click()
    await expect(page.getByRole('link').filter({ hasText: tripName })).toBeVisible()

    await page.getByRole('link').filter({ hasText: tripName }).click()
    await expect(page).toHaveURL(new RegExp(`${tripPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()
    await expect(page.getByText('Da Lat, Vietnam').first()).toBeVisible()
  })

  test('edits and deletes a trip', async ({ page }) => {
    const user = await createTestUser('trip-crud')
    const tripName = uniqueName('Editable trip')

    await loginAs(page, user)
    const tripPath = await createTripViaUi(page, {
      name: tripName,
      destination: 'Hoi An',
    })

    await page.goto(tripPath)
    await page.getByRole('link', { name: 'Trip settings' }).click()
    await expect(page).toHaveURL(`${tripPath}/settings`)
    await page.getByRole('button', { name: 'Edit details' }).click()

    const editDialog = page.getByRole('dialog', { name: 'Edit trip' })
    await expect(editDialog).toBeVisible()
    await editDialog.locator('#trip-destination').fill('Hue, Vietnam')
    await editDialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(editDialog).toBeHidden({ timeout: 25_000 })
    await expect(page.getByText('Hue, Vietnam').first()).toBeVisible()

    await page.getByRole('button', { name: 'Delete trip' }).click()
    const confirm = page.getByRole('dialog', { name: 'Delete this trip forever?' })
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Delete trip' }).click()

    await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 25_000 })
    await expect(page.getByRole('link').filter({ hasText: tripName })).toHaveCount(0)
  })
})
