import { expect, test } from '@playwright/test'
import { createTestUser } from './support/admin'
import { loginAs } from './support/ui'

test.describe('authentication', () => {
  test('redirects signed-out visitors to the social login page', async ({ page }) => {
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/)
    await expect(page.getByRole('heading', { name: 'Welcome to Wanderlist' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible()
  })

  test('signed-in visitors are sent from login to their trip dashboard', async ({ page }) => {
    const user = await createTestUser('login')

    await loginAs(page, user)
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()

    await page.goto('/login')
    await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
  })

  test('unsafe redirect parameters are discarded', async ({ page }) => {
    await page.goto('/login?redirect=https%3A%2F%2Fevil.example%2Fsteal')

    await expect(page.getByRole('heading', { name: 'Welcome to Wanderlist' })).toBeVisible()
    const oauthRequest = page.waitForRequest((request) =>
      request.url().includes('/auth/v1/authorize'),
    )
    await page.getByRole('button', { name: 'Continue with Google' }).click()

    const request = await oauthRequest
    const redirectTo = new URL(request.url()).searchParams.get('redirect_to') ?? ''
    expect(redirectTo).toContain('/auth/callback')
    expect(redirectTo).not.toContain('evil.example')
  })
})
