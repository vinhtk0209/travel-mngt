import { expect, test } from '@playwright/test'
import { addTripEditor, createTestUser, createTripForUser } from './support/admin'
import { loginAs, uniqueName } from './support/ui'

test.describe('realtime', () => {
  test('editor sees a tag created by the owner without reloading', async ({ browser }) => {
    const owner = await createTestUser('rt-owner')
    const editor = await createTestUser('rt-editor')
    const tripName = uniqueName('Realtime trip')
    const tagName = uniqueName('Sunset spot')

    const tripId = await createTripForUser(owner, {
      name: tripName,
      destination: 'Phu Quoc',
    })
    await addTripEditor(tripId, editor)

    const ownerContext = await browser.newContext()
    const editorContext = await browser.newContext()
    const ownerPage = await ownerContext.newPage()
    const editorPage = await editorContext.newPage()

    try {
      await loginAs(ownerPage, owner)
      await loginAs(editorPage, editor)

      await ownerPage.goto(`/trips/${tripId}/settings`)
      await editorPage.goto(`/trips/${tripId}/settings`)

      await expect(ownerPage.getByRole('heading', { name: 'Trip settings' })).toBeVisible()
      await expect(editorPage.getByRole('heading', { name: 'Trip settings' })).toBeVisible()
      await expect(editorPage.getByText(tagName, { exact: true })).toHaveCount(0)

      await editorPage.waitForTimeout(1_000)

      await ownerPage.getByLabel('New tag name').fill(tagName)
      await ownerPage.getByRole('button', { name: 'Add tag' }).click()
      await expect(ownerPage.getByText(tagName, { exact: true })).toBeVisible()

      await expect(editorPage.getByText(tagName, { exact: true })).toBeVisible({
        timeout: 20_000,
      })
    } finally {
      await ownerContext.close()
      await editorContext.close()
    }
  })
})
