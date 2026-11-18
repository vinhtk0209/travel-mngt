import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { createTestUser, createTripForUser, type TestUser } from './support/admin'
import { loginAs } from './support/ui'

const SCREENSHOTS = join(process.cwd(), 'evidence', 'chatbot')

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(SCREENSHOTS, name), fullPage: true })
}

test.beforeAll(async () => {
  mkdirSync(SCREENSHOTS, { recursive: true })
})

test.describe.serial('trip assistant modes', () => {
  let owner: TestUser
  let tripId: string
  let tripName: string
  let tripPath: string

  test.beforeAll(async () => {
    owner = await createTestUser('assistant')
    tripName = `Assistant Trip ${Date.now().toString(36)}`
    tripId = await createTripForUser(owner, {
      name: tripName,
      destination: 'Hoi An, Vietnam',
      description: 'Lanterns, tailor shops and very good noodles.',
    })
    tripPath = `/trips/${tripId}`
  })

  test('basic mode answers inside a trip without any API key', async ({ page }) => {
    await loginAs(page, owner, tripPath)
    await expect(page.getByRole('heading', { name: tripName })).toBeVisible()

    await page.getByRole('button', { name: 'Ask Wanderbot' }).click()
    const dialog = page.getByRole('dialog', { name: 'Wanderbot trip ideas' })
    await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Basic' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(dialog.getByRole('button', { name: 'Gemini AI' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    await dialog.getByLabel('Message Wanderbot').fill('What should I pack?')
    await dialog.getByRole('button', { name: 'Send message' }).click()

    await expect(dialog.getByText(/Basic packing playbook for Hoi An/)).toBeVisible({
      timeout: 10_000,
    })
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await shot(page, 'chatbot-basic-reply.png')

    await dialog.getByRole('button', { name: 'Close dialog' }).click()
    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Ask Wanderbot' }).click()
    const darkDialog = page.getByRole('dialog', { name: 'Wanderbot trip ideas' })
    await darkDialog.getByLabel('Message Wanderbot').fill('How do I budget for this trip?')
    await darkDialog.getByRole('button', { name: 'Send message' }).click()
    await expect(darkDialog.getByText(/Basic budget rule for Hoi An/)).toBeVisible({
      timeout: 10_000,
    })
    await shot(page, 'chatbot-basic-dark.png')
  })

  test('gemini mode reports a missing server key without pretending to answer', async ({
    page,
  }) => {
    await loginAs(page, owner, tripPath)
    await page.getByRole('button', { name: 'Ask Wanderbot' }).click()
    const dialog = page.getByRole('dialog', { name: 'Wanderbot trip ideas' })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Gemini AI' }).click()
    await expect(dialog.getByRole('button', { name: 'Gemini AI' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await dialog.getByLabel('Message Wanderbot').fill('Plan a food-focused day')
    await dialog.getByRole('button', { name: 'Send message' }).click()

    const alert = dialog.getByRole('alert')
    await expect(alert).toBeVisible({ timeout: 20_000 })
    await expect(alert).toContainText(/not configured/i)
    await expect(dialog.getByText(/You can keep chatting in Basic mode/)).toBeVisible()
    await shot(page, 'chatbot-gemini-unconfigured.png')

    await dialog.getByRole('button', { name: 'Basic' }).click()
    await expect(dialog.getByRole('alert')).toHaveCount(0)
    await expect(dialog.getByText(/Basic mode/i).first()).toBeVisible()
    await shot(page, 'chatbot-basic-fallback.png')
  })

  test('the chosen mode persists for the member', async ({ page }) => {
    await loginAs(page, owner, tripPath)
    await page.getByRole('button', { name: 'Ask Wanderbot' }).click()
    let dialog = page.getByRole('dialog', { name: 'Wanderbot trip ideas' })
    await dialog.getByRole('button', { name: 'Gemini AI' }).click()
    await expect(dialog.getByRole('button', { name: 'Gemini AI' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await dialog.getByRole('button', { name: 'Close dialog' }).click()

    await page.reload()
    await page.getByRole('button', { name: 'Ask Wanderbot' }).click()
    dialog = page.getByRole('dialog', { name: 'Wanderbot trip ideas' })
    await expect(dialog.getByRole('button', { name: 'Gemini AI' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await shot(page, 'chatbot-mode-persisted.png')

    await dialog.getByRole('button', { name: 'Basic' }).click()
    await expect(dialog.getByRole('button', { name: 'Basic' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
