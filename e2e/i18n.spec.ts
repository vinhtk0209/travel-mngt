import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { createTestUser, createTripForUser, getProfileLocale, type TestUser } from './support/admin'
import { loginAs } from './support/ui'

const screenshots = join(process.cwd(), 'evidence', 'i18n')
async function shot(page: Page, name: string) {
  await page.screenshot({ path: join(screenshots, name), fullPage: true })
}
test.beforeAll(() => mkdirSync(screenshots, { recursive: true }))

test.describe.serial('English and Vietnamese localization', () => {
  let user: TestUser
  test.beforeAll(async () => {
    user = await createTestUser('i18n')
    await createTripForUser(user, { name: 'Localized Trip' })
  })

  test('switches to Vietnamese, persists it, and survives a reload', async ({ page }) => {
    await loginAs(page, user, '/dashboard')
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
    await shot(page, '01-dashboard-english.png')

    await page.getByRole('button', { name: 'Language' }).click()
    await page.getByRole('menuitemradio', { name: 'Tiếng Việt' }).click()
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('vi')
    await expect(page.getByRole('heading', { name: /where to next/i })).toHaveCount(0)
    await shot(page, '02-dashboard-vietnamese.png')
    await expect.poll(() => getProfileLocale(user.id)).toBe('vi')

    await page.reload()
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('vi')
    await page.goto('/profile')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await shot(page, '03-profile-vietnamese.png')
  })

  test('a fresh browser session restores the saved Vietnamese preference', async ({ page }) => {
    await loginAs(page, user, '/dashboard')
    await expect.poll(() => page.evaluate(() => document.documentElement.lang)).toBe('vi')
    await page.getByRole('button', { name: 'Ngôn ngữ' }).click()
    await page.getByRole('menuitemradio', { name: 'English' }).click()
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
    await expect.poll(() => getProfileLocale(user.id)).toBe('en')
  })
})
