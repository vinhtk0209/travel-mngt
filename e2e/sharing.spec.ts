import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  createTestUser,
  createTripForUser,
  getTripMemberRole,
  type TestUser,
} from './support/admin'
import { loginAs } from './support/ui'

const SCREENSHOTS = join(process.cwd(), 'evidence', 'sharing')

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(SCREENSHOTS, name), fullPage: true })
}

test.beforeAll(async () => {
  mkdirSync(SCREENSHOTS, { recursive: true })
})

test.describe.serial('link sharing', () => {
  let owner: TestUser
  let buddy: TestUser
  let tripId: string
  let tripName: string
  let tripPath: string
  let shareUrl = ''
  let sharePath = ''

  test.beforeAll(async () => {
    owner = await createTestUser('share-owner')
    buddy = await createTestUser('share-buddy')
    tripName = `Shared Escape ${Date.now().toString(36)}`
    tripId = await createTripForUser(owner, {
      name: tripName,
      destination: 'Ninh Binh, Vietnam',
      description: 'Limestone valleys, slow bikes and quiet rice fields.',
    })
    tripPath = `/trips/${tripId}`
  })

  test('owner creates a viewer link and can rotate or stop it', async ({ page, browser }) => {
    await loginAs(page, owner, tripPath)
    await page.getByRole('button', { name: 'Share trip' }).click()

    const dialog = page.getByRole('dialog', { name: 'Share this trip' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Link sharing is off')).toBeVisible()
    await dialog.locator('#share-role').selectOption('viewer')
    await dialog.getByRole('button', { name: 'Create share link' }).click()

    const linkInput = dialog.locator('#share-link')
    await expect(linkInput).toHaveValue(/\/share\//, { timeout: 25_000 })
    shareUrl = await linkInput.inputValue()
    sharePath = new URL(shareUrl).pathname
    await expect(dialog.getByText(/Anyone with this link can join as a viewer/)).toBeVisible()
    await shot(page, '01-link-created-viewer.png')

    await dialog.getByRole('button', { name: 'New link' }).click()
    const rotate = page.getByRole('dialog', { name: 'Create a new link?' })
    await rotate.getByRole('button', { name: 'Create new link' }).click()
    await expect(linkInput).not.toHaveValue(shareUrl, { timeout: 25_000 })
    const rotatedUrl = await linkInput.inputValue()
    expect(rotatedUrl).not.toBe(shareUrl)

    const stalePage = await browser.newPage()
    try {
      await stalePage.goto(sharePath)
      await expect(
        stalePage.getByRole('heading', { name: 'This link is no longer active' }),
      ).toBeVisible()
    } finally {
      await stalePage.close()
    }

    shareUrl = rotatedUrl
    sharePath = new URL(shareUrl).pathname
    await dialog.getByRole('button', { name: 'Stop sharing' }).click()
    const stop = page.getByRole('dialog', { name: 'Stop link sharing?' })
    await stop.getByRole('button', { name: 'Stop sharing' }).click()
    await expect(dialog.getByText('Link sharing is off')).toBeVisible({ timeout: 25_000 })
    await shot(page, '02-link-sharing-off.png')

    await dialog.getByRole('button', { name: 'Create share link' }).click()
    await expect(linkInput).toHaveValue(/\/share\//, { timeout: 25_000 })
    shareUrl = await linkInput.inputValue()
    sharePath = new URL(shareUrl).pathname
    await dialog.getByRole('button', { name: 'Done' }).click()
    await expect(dialog).toBeHidden()
  })

  test('anonymous visitors see a preview and a sign-in gate', async ({ page }) => {
    await page.goto(sharePath)
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()
    await expect(page.getByText('Ninh Binh, Vietnam')).toBeVisible()
    await expect(page.getByText(/shared this trip with you/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in to join' })).toBeVisible()
    await expect(page.getByText(/Joining gives you viewer access/i)).toBeVisible()
    await shot(page, '03-anonymous-preview.png')
  })

  test('a viewer can join but cannot edit the trip', async ({ page }) => {
    await loginAs(page, buddy, sharePath)
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()
    await shot(page, '04-signed-in-join-cta.png')

    await page.getByRole('button', { name: 'Join this trip' }).click()
    await page.waitForURL((url) => url.pathname === tripPath, { timeout: 25_000 })
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()

    await expect(page.getByRole('button', { name: /Add place|Add your first place/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'Trip settings' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Share trip' })).toHaveCount(0)
    await expect(page.getByText('Viewer', { exact: true })).toBeVisible()
    await shot(page, '05-viewer-trip-read-only.png')

    expect(await getTripMemberRole(tripId, buddy.id)).toBe('viewer')
  })
})
