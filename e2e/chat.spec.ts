import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  addTripMember,
  createTestUser,
  createTripForUser,
  type TestUser,
} from './support/admin'
import { loginAs } from './support/ui'

const SCREENSHOTS = join(process.cwd(), 'evidence', 'chat')

const MEME_FIXTURE = join(process.cwd(), 'e2e', 'fixtures', 'meme.gif')
const WALLPAPER_FIXTURE = join(process.cwd(), 'e2e', 'fixtures', 'wallpaper.png')

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(SCREENSHOTS, name), fullPage: true })
}

function chatInput(page: Page) {
  return page.getByLabel('Message the trip')
}

test.beforeAll(async () => {
  mkdirSync(SCREENSHOTS, { recursive: true })
})

test.describe.serial('trip chat', () => {
  let owner: TestUser
  let buddy: TestUser
  let viewer: TestUser
  let tripId: string
  let tripName: string
  let tripPath: string

  test.beforeAll(async () => {
    owner = await createTestUser('chat-owner')
    buddy = await createTestUser('chat-buddy')
    viewer = await createTestUser('chat-viewer')
    tripName = `Chatty Escape ${Date.now().toString(36)}`
    tripId = await createTripForUser(owner, {
      name: tripName,
      destination: 'Hue, Vietnam',
      description: 'A slow weekend of river walks and tiny bowls of noodles.',
    })
    await addTripMember(tripId, buddy, 'editor')
    await addTripMember(tripId, viewer, 'viewer')
    tripPath = `/trips/${tripId}`
  })

  test('members send messages and receive them live', async ({ page, browser }) => {
    await loginAs(page, owner, tripPath)
    await expect(page.getByRole('heading', { name: 'Trip chat' })).toBeVisible()

    await chatInput(page).fill('Meet at the river walk at 7?')
    await chatInput(page).press('Enter')
    await expect(page.getByText('Meet at the river walk at 7?')).toBeVisible({ timeout: 15_000 })
    await shot(page, '01-chat-owner-first-message.png')

    const buddyPage = await browser.newPage()
    try {
      await loginAs(buddyPage, buddy, tripPath)
      await expect(buddyPage.getByText('Meet at the river walk at 7?')).toBeVisible()

      await chatInput(buddyPage).fill('Bring the good camera')
      await buddyPage.getByRole('button', { name: 'Send message' }).click()
      await expect(buddyPage.getByText('Bring the good camera')).toBeVisible({ timeout: 15_000 })
      await shot(buddyPage, '02-chat-buddy-reply.png')

      await expect(page.getByText('Bring the good camera')).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText('Bring the good camera')).toHaveCount(1)
      await shot(page, '03-chat-realtime-owner.png')
    } finally {
      await buddyPage.close()
    }

    await page.reload()
    await expect(page.getByText('Meet at the river walk at 7?')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Bring the good camera')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Bring the good camera')).toHaveCount(1)
  })

  test('editors react, attach a GIF, and change the wallpaper', async ({ page }) => {
    await loginAs(page, owner, tripPath)
    await expect(page.getByText('Meet at the river walk at 7?')).toBeVisible()

    const firstMessage = page
      .locator('[data-chat-message]')
      .filter({ hasText: 'Meet at the river walk at 7?' })
    await firstMessage.getByRole('button', { name: 'Reactions' }).click()
    await firstMessage.getByRole('button', { name: 'React with ❤️' }).click()
    await expect(firstMessage.getByRole('button', { name: 'React with ❤️' })).toContainText('1')

    await page.getByLabel('Attach a photo or GIF').setInputFiles(MEME_FIXTURE)
    await expect(page.getByAltText('Attachment preview')).toBeVisible()
    await chatInput(page).fill('Meme drop')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByAltText('meme.gif')).toBeVisible({ timeout: 30_000 })
    await shot(page, '04-chat-reaction-and-meme.png')

    await page.getByRole('button', { name: 'Chat wallpaper' }).click()
    const wallpaperDialog = page.getByRole('dialog', { name: 'Chat wallpaper' })
    await expect(wallpaperDialog).toBeVisible()
    await wallpaperDialog.getByRole('button', { name: 'Sunset', exact: true }).click()
    await expect(wallpaperDialog).toBeHidden({ timeout: 20_000 })
    await expect(page.getByTestId('trip-chat-scroll')).toHaveCSS(
      'background-image',
      /linear-gradient/,
    )

    await page.getByRole('button', { name: 'Chat wallpaper' }).click()
    await wallpaperDialog.getByLabel('Upload photo').setInputFiles(WALLPAPER_FIXTURE)
    await expect(wallpaperDialog).toBeHidden({ timeout: 30_000 })
    await expect(page.getByTestId('trip-chat-scroll')).toHaveCSS('background-image', /url\(/)
    await shot(page, '05-chat-custom-wallpaper.png')
  })

  test('viewers can read chat media but cannot post or react', async ({ page }) => {
    await loginAs(page, viewer, tripPath)
    await expect(page.getByRole('heading', { name: 'Trip chat' })).toBeVisible()
    await expect(page.getByText('Meet at the river walk at 7?')).toBeVisible()
    await expect(page.getByText('Bring the good camera')).toBeVisible()
    await expect(page.getByAltText('meme.gif')).toBeVisible()
    await expect(
      page
        .locator('[data-chat-message]')
        .filter({ hasText: 'Meet at the river walk at 7?' })
        .getByRole('button', { name: 'React with ❤️' }),
    ).toContainText('1')
    await expect(chatInput(page)).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Chat wallpaper' })).toHaveCount(0)
    await expect(page.getByText(/view-only access/)).toBeVisible()
    await shot(page, '06-chat-viewer-read-only.png')
  })
})
