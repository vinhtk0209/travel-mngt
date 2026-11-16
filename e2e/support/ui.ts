import { randomUUID } from 'node:crypto'
import { expect, type Page } from '@playwright/test'
import type { TestUser } from './admin'

export function uniqueName(prefix: string): string {
  return `${prefix} ${randomUUID().slice(0, 8)}`
}

export async function loginAs(
  page: Page,
  user: Pick<TestUser, 'email' | 'password'>,
  redirectPath = '/dashboard',
): Promise<void> {
  await page.goto(`/login?redirect=${encodeURIComponent(redirectPath)}`)
  await page.getByLabel('Email', { exact: true }).fill(user.email)
  await page.getByLabel('Password', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 25_000 })
}

export async function registerViaUi(
  page: Page,
  input: { displayName: string; email: string; password: string },
): Promise<void> {
  await page.goto('/register')
  await page.getByLabel('Your name').fill(input.displayName)
  await page.getByLabel('Email', { exact: true }).fill(input.email)
  await page.getByLabel('Password', { exact: true }).fill(input.password)
  await page.getByLabel('Confirm password').fill(input.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 25_000 })
  await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()
}

export async function signOutViaUi(page: Page): Promise<void> {
  await page.locator('header button[aria-haspopup="menu"]').click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.waitForURL((url) => url.pathname === '/login', { timeout: 20_000 })
}

export async function createTripViaUi(
  page: Page,
  input: { name: string; destination?: string; description?: string },
): Promise<string> {
  if (new URL(page.url()).pathname !== '/dashboard') {
    await page.goto('/dashboard')
  }
  await expect(page.getByRole('heading', { name: /where to next/i })).toBeVisible()

  await page.getByRole('button', { name: 'Plan a trip', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Plan a new trip' })
  await expect(dialog).toBeVisible()
  await dialog.locator('#trip-name').fill(input.name)
  if (input.destination) await dialog.locator('#trip-destination').fill(input.destination)
  if (input.description) await dialog.locator('#trip-description').fill(input.description)
  await dialog.getByRole('button', { name: 'Create trip' }).click()
  await expect(dialog).toBeHidden({ timeout: 25_000 })

  const tripLink = page.getByRole('link').filter({ hasText: input.name }).first()
  await expect(tripLink).toBeVisible()
  const href = await tripLink.getAttribute('href')
  if (!href) throw new Error(`Could not find the link for trip "${input.name}".`)
  return href
}

export async function addPlaceViaUi(
  page: Page,
  input: { name: string; address?: string; notes?: string; tagName?: string },
): Promise<void> {
  await page.getByRole('button', { name: /Add place|Add your first place/ }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Add a place' })
  await expect(dialog).toBeVisible()

  await dialog.locator('#place-name').fill(input.name)
  if (input.address) await dialog.locator('#place-address').fill(input.address)
  if (input.notes) await dialog.locator('#place-notes').fill(input.notes)

  if (input.tagName) {
    await dialog.getByRole('button', { name: 'New tag' }).click()
    await dialog.getByLabel('New tag name').fill(input.tagName)
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(dialog.getByText(input.tagName, { exact: true })).toBeVisible()
  }

  await dialog.getByRole('button', { name: 'Add place', exact: true }).click()
  await expect(dialog).toBeHidden({ timeout: 25_000 })
  await expect(page.getByRole('heading', { name: input.name })).toBeVisible()
}

export async function inviteMemberThroughUi(
  page: Page,
  input: { tripPath: string; email: string; role?: 'editor' | 'viewer' },
): Promise<string> {
  if (new URL(page.url()).pathname !== input.tripPath) {
    await page.goto(input.tripPath)
  }
  await page.getByRole('button', { name: 'Invite', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Invite a travel buddy' })
  await expect(dialog).toBeVisible()
  await dialog.locator('#invite-email').fill(input.email)
  await dialog.locator('#invite-role').selectOption(input.role ?? 'editor')
  await dialog.getByRole('button', { name: 'Send invite' }).click()
  await expect(dialog.getByText('Invitation ready')).toBeVisible({ timeout: 25_000 })

  const inviteLink = await dialog.locator('#invite-link').inputValue()
  if (!inviteLink) throw new Error('The invitation dialog did not return a link.')
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()

  return new URL(inviteLink).pathname
}

export async function acceptInvitationViaUi(page: Page, invitePath: string): Promise<string> {
  await page.goto(invitePath)
  await expect(page.getByRole('heading', { name: 'A trip is waiting for you' })).toBeVisible()
  await page.getByRole('button', { name: 'Accept and join' }).click()
  await page.waitForURL((url) => url.pathname.startsWith('/trips/'), { timeout: 25_000 })
  return new URL(page.url()).pathname
}

export function placeRow(page: Page, placeName: string) {
  return page.locator('.surface-card').filter({ hasText: placeName }).first()
}
