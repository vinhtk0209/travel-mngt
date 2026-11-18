import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  createPlaceForTrip,
  createTestUser,
  createTripForUser,
  getTripMemberRole,
  type TestUser,
} from './support/admin'
import { loginAs } from './support/ui'

const SCREENSHOTS = join(process.cwd(), 'e2e', 'screenshots')

const PNG_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(SCREENSHOTS, name), fullPage: true })
}

test.beforeAll(async () => {
  mkdirSync(SCREENSHOTS, { recursive: true })
})

test.describe.serial('new features', () => {
  let owner: TestUser
  let buddy: TestUser
  let tripId: string
  let tripName: string
  let tripPath: string
  let mapPlaceName: string

  test.beforeAll(async () => {
    const suffix = Date.now().toString(36)
    owner = await createTestUser('owner')
    buddy = await createTestUser('buddy')
    tripName = `Playwright Escape ${suffix}`
    tripId = await createTripForUser(owner, {
      name: tripName,
      destination: 'Da Lat, Vietnam',
      description: 'A trip created by the feature evidence suite.',
    })
    tripPath = `/trips/${tripId}`
    mapPlaceName = `Coffee Corner ${suffix}`
    await createPlaceForTrip(owner, tripId, {
      name: mapPlaceName,
      address: '27 Truc Lam, Da Lat, Vietnam',
      notes: 'A quiet place with a map link.',
    })
  })

  test('dark mode toggles and persists', async ({ page }) => {
    await loginAs(page, owner)
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
    await shot(page, '00-light-mode.png')

    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await shot(page, '01-dark-mode.png')

    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible()
    await shot(page, '01b-dark-mode-persisted.png')
  })

  test('google maps links work in list and card views', async ({ page }) => {
    await loginAs(page, owner, tripPath)
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()

    const mapLink = page.getByRole('link', { name: `Open ${mapPlaceName} in Google Maps` })
    await expect(mapLink).toBeVisible()
    await expect(mapLink).toHaveAttribute(
      'href',
      /google\.com\/maps\/search\/\?api=1&query=27%20Truc%20Lam/,
    )
    await mapLink.hover()
    await shot(page, '02-maps-list.png')

    await page.getByRole('button', { name: 'Card view' }).click()
    await expect(page.getByRole('button', { name: `Edit ${mapPlaceName}` })).toBeVisible()
    await expect(page.getByRole('button', { name: `Delete ${mapPlaceName}` })).toBeVisible()
    await expect(mapLink).toBeVisible()
    await expect(page.getByText('Open in Maps', { exact: true })).toBeVisible()
    await shot(page, '03-maps-card-owner-actions.png')
  })

  test('owner creates a share link and another user joins', async ({ page, browser }) => {
    await loginAs(page, owner, tripPath)
    await page.getByRole('button', { name: 'Share trip' }).click()

    const dialog = page.getByRole('dialog', { name: 'Share this trip' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Create share link' }).click()

    const linkInput = dialog.locator('#share-link')
    await expect(linkInput).toHaveValue(/\/share\//, { timeout: 25_000 })
    const inviteLink = await linkInput.inputValue()
    expect(inviteLink).toContain('/share/')
    await shot(page, '04-share-link-ready.png')
    await dialog.getByRole('button', { name: 'Done' }).click()

    const invitePath = new URL(inviteLink).pathname
    const buddyPage = await browser.newPage()
    try {
      await loginAs(buddyPage, buddy, invitePath)
      await expect(buddyPage.getByRole('heading', { name: tripName })).toBeVisible()
      await buddyPage.getByRole('button', { name: 'Join this trip' }).click()
      await buddyPage.waitForURL((url) => url.pathname === tripPath, { timeout: 25_000 })
      await expect(buddyPage.getByRole('heading', { name: tripName })).toBeVisible()
      await shot(buddyPage, '05-share-link-joined.png')
    } finally {
      await buddyPage.close()
    }

    expect(await getTripMemberRole(tripId, buddy.id)).toBe('editor')
  })

  test('wanderbot suggests a trip and prefills the planner', async ({ page }) => {
    await loginAs(page, owner)
    await page.getByRole('button', { name: 'Trip ideas' }).click()

    const assistant = page.getByRole('dialog', { name: 'Wanderbot trip ideas' })
    await expect(assistant).toBeVisible()
    await assistant.getByRole('button', { name: '3 days by the beach' }).click()

    const planButton = assistant.getByRole('button', { name: 'Plan' }).first()
    await expect(planButton).toBeVisible({ timeout: 10_000 })
    await expect(assistant.getByRole('button', { name: 'Plan' })).toHaveCount(4)
    await shot(page, '06-wanderbot-suggestions.png')

    await planButton.click()
    const tripDialog = page.getByRole('dialog', { name: 'Plan a new trip' })
    await expect(tripDialog).toBeVisible()
    const prefilledName = await tripDialog.locator('#trip-name').inputValue()
    expect(prefilledName.length).toBeGreaterThan(0)
    await expect(tripDialog.locator('#trip-destination')).not.toHaveValue('')
    await shot(page, '07-wanderbot-prefilled-planner.png')
    await tripDialog.getByRole('button', { name: 'Cancel' }).click()
  })

  test('owner uploads a photo for a new place', async ({ page }) => {
    await loginAs(page, owner, tripPath)
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()

    const placeName = `Photo Stop ${Date.now().toString(36)}`
    await page.getByRole('button', { name: /Add place|Add your first place/ }).first().click()

    const dialog = page.getByRole('dialog', { name: 'Add a place' })
    await expect(dialog).toBeVisible()
    await dialog.locator('#place-name').fill(placeName)
    await dialog.locator('#place-address').fill('1 Tran Phu, Da Lat, Vietnam')
    await dialog.locator('input[type="file"]').setInputFiles({
      name: 'tiny.png',
      mimeType: 'image/png',
      buffer: PNG_PIXEL,
    })
    await expect(dialog.getByRole('img', { name: 'tiny.png' })).toBeVisible()
    await dialog.getByRole('button', { name: 'Add place', exact: true }).click()
    await expect(dialog).toBeHidden({ timeout: 25_000 })

    const thumbnail = page.locator(`button[aria-label="Preview photos of ${placeName}"] img`)
    await expect(thumbnail).toBeVisible({ timeout: 25_000 })
    await expect
      .poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0)
    await expect(page.getByText('Could not save this place')).toHaveCount(0)
    await shot(page, '08-photo-upload.png')
  })
})
