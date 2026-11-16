import { expect, test } from '@playwright/test'
import { createTestUser } from './support/admin'
import {
  addPlaceViaUi,
  createTripViaUi,
  loginAs,
  placeRow,
  uniqueName,
} from './support/ui'

test.describe('places', () => {
  test('adds, completes, filters, edits and deletes a place', async ({ page }) => {
    const user = await createTestUser('places')
    const tripName = uniqueName('Places trip')
    const placeName = uniqueName('Coconut coffee')
    const tagName = uniqueName('Cafe')

    await loginAs(page, user)
    const tripPath = await createTripViaUi(page, {
      name: tripName,
      destination: 'Da Lat',
    })
    await page.goto(tripPath)

    await addPlaceViaUi(page, {
      name: placeName,
      address: '27 Truc Lam, Da Lat',
      notes: 'Get the coconut coffee and sit by the window.',
      tagName,
    })

    const row = placeRow(page, placeName)
    await expect(row).toContainText('27 Truc Lam, Da Lat')
    await expect(row).toContainText('Get the coconut coffee')
    await expect(row).toContainText(tagName)
    await expect(page.getByText(/0 \/ 1 completed/)).toBeVisible()

    await row.getByRole('button', { name: 'Mark as completed' }).click()
    await expect(page.getByText(/1 \/ 1 completed/)).toBeVisible()
    await expect(row.getByText('Done', { exact: true })).toBeVisible()

    const statusFilter = page.getByRole('group', { name: 'Filter by status' })
    await statusFilter.getByRole('button', { name: 'Done' }).click()
    await expect(page.getByRole('heading', { name: placeName })).toBeVisible()

    await statusFilter.getByRole('button', { name: 'To do' }).click()
    await expect(page.getByText('Nothing matches those filters')).toBeVisible()
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await expect(page.getByRole('heading', { name: placeName })).toBeVisible()

    await row.getByRole('button', { name: `Edit ${placeName}` }).click()
    const editDialog = page.getByRole('dialog', { name: 'Edit place' })
    await expect(editDialog).toBeVisible()
    await editDialog.locator('#place-notes').fill('Order two — one is never enough.')
    await editDialog.getByRole('button', { name: 'Save place' }).click()
    await expect(editDialog).toBeHidden({ timeout: 25_000 })
    await expect(row).toContainText('Order two')

    await row.getByRole('button', { name: `Delete ${placeName}` }).click()
    const confirm = page.getByRole('dialog', { name: 'Delete this place?' })
    await expect(confirm).toBeVisible()
    await confirm.getByRole('button', { name: 'Delete place' }).click()
    await expect(page.getByRole('heading', { name: placeName })).toHaveCount(0)
    await expect(page.getByText('No places yet')).toBeVisible()
  })
})
