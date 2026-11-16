import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'
import { createTestUser, TEST_PASSWORD } from './support/admin'
import { clearMailbox, extractMagicLink, extractOtp, waitForEmail } from './support/email'
import { loginAs, registerViaUi, signOutViaUi } from './support/ui'

test.describe('authentication', () => {
  test('redirects to login, then returns to the requested page', async ({ page }) => {
    const user = await createTestUser('login')

    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/)
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()

    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill(user.password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await page.waitForURL((url) => url.pathname === '/dashboard')
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
    await signOutViaUi(page)
  })

  test('registers a new account and can sign back in', async ({ page }) => {
    const suffix = randomUUID().slice(0, 8)
    const user = {
      displayName: 'Playwright Traveler',
      email: `e2e.register.${suffix}@example.com`,
      password: TEST_PASSWORD,
    }

    await registerViaUi(page, user)
    await expect(page.getByRole('heading', { name: /Hi Playwright, where to next/i })).toBeVisible()
    await signOutViaUi(page)

    await loginAs(page, user)
    await expect(page.getByRole('heading', { name: /Hi Playwright, where to next/i })).toBeVisible()
  })

  test('shows an error for a wrong password', async ({ page }) => {
    const user = await createTestUser('wrong-password')

    await page.goto('/login')
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill('definitely-wrong')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await expect(page.getByText(/invalid login credentials|could not sign in/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('signs in with the 6-digit email code', async ({ page }) => {
    const user = await createTestUser('otp')
    await clearMailbox()

    await page.goto('/login/email?redirect=%2Fdashboard')
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByRole('button', { name: 'Send sign-in email' }).click()
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible()

    const message = await waitForEmail(user.email, 'Your Wanderlist sign-in link')
    const otp = extractOtp(message)

    await page.getByLabel('6-digit code').fill(otp)
    await page.getByRole('button', { name: 'Verify code' }).click()
    await page.waitForURL((url) => url.pathname === '/dashboard')
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
    await signOutViaUi(page)
  })

  test('signs in by clicking the magic link', async ({ page }) => {
    const user = await createTestUser('magic-link')
    await clearMailbox()

    await page.goto('/login/email?redirect=%2Fdashboard')
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByRole('button', { name: 'Send sign-in email' }).click()
    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible()

    const message = await waitForEmail(user.email, 'Your Wanderlist sign-in link')
    const magicLink = extractMagicLink(message)

    await page.goto(magicLink)
    await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
  })

  test('does not reveal whether an email has an account', async ({ page }) => {
    await clearMailbox()
    const unknownEmail = `e2e.unknown.${randomUUID().slice(0, 8)}@example.com`

    await page.goto('/login/email')
    await page.getByLabel('Email', { exact: true }).fill(unknownEmail)
    await page.getByRole('button', { name: 'Send sign-in email' }).click()

    await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible()
    await expect(page.getByText(unknownEmail)).toBeVisible()
  })

  test('rejects an external redirect after login', async ({ page }) => {
    const user = await createTestUser('safe-redirect')

    await page.goto('/login?redirect=https%3A%2F%2Fevil.example%2Fsteal')
    await page.getByLabel('Email', { exact: true }).fill(user.email)
    await page.getByLabel('Password', { exact: true }).fill(user.password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    await page.waitForURL((url) => url.pathname === '/dashboard')
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5173\/dashboard$/)
  })
})
