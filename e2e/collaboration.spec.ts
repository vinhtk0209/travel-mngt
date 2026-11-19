import { expect, test } from '@playwright/test'
import { createTestUser } from './support/admin'
import {
  addPlaceViaUi,
  createTripViaUi,
  loginAs,
  signOutViaUi,
  uniqueName,
} from './support/ui'

test.describe('collaboration', () => {
  test('owner shares an editable link, then downgrades the editor to viewer', async ({ page }) => {
    const owner = await createTestUser('owner')
    const editor = await createTestUser('editor')
    const tripName = uniqueName('Shared trip')

    await loginAs(page, owner)
    const tripPath = await createTripViaUi(page, {
      name: tripName,
      destination: 'Ninh Binh',
    })
    await page.goto(tripPath)

    await page.getByRole('button', { name: 'Share trip' }).click()
    const dialog = page.getByRole('dialog', { name: 'Share this trip' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Create share link' }).click()
    const linkInput = dialog.locator('#share-link')
    await expect(linkInput).toHaveValue(/\/share\//, { timeout: 25_000 })
    const sharePath = new URL(await linkInput.inputValue()).pathname
    await dialog.getByRole('button', { name: 'Done' }).click()
    await expect(dialog).toBeHidden()
    await signOutViaUi(page)

    await loginAs(page, editor, sharePath)
    await page.getByRole('button', { name: 'Join this trip' }).click()
    await page.waitForURL((url) => url.pathname === tripPath, { timeout: 25_000 })
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()
    await addPlaceViaUi(page, {
      name: uniqueName('Editor pick'),
      notes: 'Added by the invited editor.',
    })
    await signOutViaUi(page)

    await loginAs(page, owner, `${tripPath}/settings`)
    const roleSelect = page.getByLabel(`Role for ${editor.displayName}`)
    await expect(roleSelect).toBeVisible()
    await roleSelect.selectOption('viewer')
    await expect(page.getByText('Member role updated')).toBeVisible()
    await signOutViaUi(page)

    await loginAs(page, editor, tripPath)
    await expect(page.getByText('View only', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Add place|Add your first place/ })).toHaveCount(0)
  })
})
