import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { createTestUser, createTripForUser, getProfileLocale, type TestUser } from './support/admin'
import { loginAs } from './support/ui'

const SCREENSHOTS = join(process.cwd(), 'evidence', 'i18n')

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(SCREENSHOTS, name), fullPage: true })
}

test.beforeAll(async () => {
  mkdirSync(SCREENSHOTS, { recursive: true })
})

test.describe.serial('English and Vietnamese localization', () => {
  let user: TestUser

  test.beforeAll(async () => {
    user = await createTestUser('i18n')
    await createTripForUser(user, { name: 'Localized Trip' })
  })

  test('switches to Vietnamese, persists it, and survives a reload', async ({ page }) => {
    await loginAs(page, user, '/dashboard')

    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'My trips', exact: true })).toBeVisible()
    await shot(page, '01-dashboard-english.png')

    await page.getByLabel('Language').selectOption('vi')

    await expect(
      page.getByRole('heading', { name: /Chào .* mình đi đâu tiếp nhỉ\?/i }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: 'Chuyến đi của tôi', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('vi')
    await shot(page, '02-dashboard-vietnamese.png')

    await expect.poll(() => getProfileLocale(user.id), { timeout: 15_000 }).toBe('vi')

    await page.reload()
    await expect(
      page.getByRole('heading', { name: /Chào .* mình đi đâu tiếp nhỉ\?/i }),
    ).toBeVisible({ timeout: 15_000 })

    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Trang cá nhân' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: 'Tải ảnh lên' })).toBeVisible()
    await shot(page, '03-profile-vietnamese.png')
  })

  test('a fresh browser session restores the saved Vietnamese preference', async ({ page }) => {
    await loginAs(page, user, '/dashboard')
    await expect(
      page.getByRole('heading', { name: /Chào .* mình đi đâu tiếp nhỉ\?/i }),
    ).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Ngôn ngữ').selectOption('en')
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect.poll(() => getProfileLocale(user.id), { timeout: 15_000 }).toBe('en')
  })
})
