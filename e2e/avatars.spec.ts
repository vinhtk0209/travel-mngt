import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  addTripMember,
  createTestUser,
  createTripForUser,
  getProfileAvatar,
  type TestUser,
} from './support/admin'
import { loginAs } from './support/ui'

const SCREENSHOTS = join(process.cwd(), 'evidence', 'avatars')
const AVATAR_SOURCE = join(process.cwd(), 'e2e', 'screenshots', '00-light-mode.png')

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(SCREENSHOTS, name), fullPage: true })
}

test.beforeAll(async () => {
  mkdirSync(SCREENSHOTS, { recursive: true })
})

test.describe.serial('profile avatars', () => {
  let owner: TestUser
  let buddy: TestUser
  let tripId: string

  test.beforeAll(async () => {
    owner = await createTestUser('avatar-owner')
    buddy = await createTestUser('avatar-buddy')
    tripId = await createTripForUser(owner, {
      name: `Avatar Trip ${Date.now().toString(36)}`,
      destination: 'Da Nang, Vietnam',
    })
    await addTripMember(tripId, buddy, 'editor')
  })

  test('owner uploads an avatar and sees it on the profile', async ({ page }) => {
    await loginAs(page, owner, '/profile')
    await expect(page.getByRole('heading', { name: 'Profile' })).toBeVisible()

    await page.getByLabel('Choose an avatar photo').setInputFiles(AVATAR_SOURCE)
    await page.getByRole('dialog', { name: 'Crop your avatar' }).getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Avatar updated')).toBeVisible({ timeout: 30_000 })

    const avatarImage = page.locator(`span[aria-label="${owner.displayName}"] img`).first()
    await expect(avatarImage).toBeVisible({ timeout: 20_000 })
    await expect
      .poll(() => avatarImage.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0)

    const stored = await getProfileAvatar(owner.id)
    expect(stored).toMatch(new RegExp(`^${owner.id}/avatar-[0-9a-f-]+\\.(png|jpg|webp)$`))
    await shot(page, '01-profile-avatar-uploaded.png')
  })

  test('trip mates see the signed avatar in shared trip views', async ({ page }) => {
    await loginAs(page, buddy, `/trips/${tripId}`)
    const avatarImage = page.locator(`span[aria-label="${owner.displayName}"] img`).first()
    await expect(avatarImage).toBeVisible({ timeout: 20_000 })
    await expect
      .poll(() => avatarImage.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0)
    await shot(page, '02-trip-member-avatar.png')
  })

  test('owner can remove the avatar and fall back to initials', async ({ page }) => {
    await loginAs(page, owner, '/profile')
    await page.getByRole('button', { name: 'Remove' }).click()
    const dialog = page.getByRole('dialog', { name: 'Remove your avatar?' })
    await dialog.getByRole('button', { name: 'Remove photo' }).click()
    await expect(page.getByText('Avatar removed')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator(`span[aria-label="${owner.displayName}"] img`)).toHaveCount(0)
    expect(await getProfileAvatar(owner.id)).toBeNull()
    await shot(page, '03-profile-avatar-removed.png')
  })
})
