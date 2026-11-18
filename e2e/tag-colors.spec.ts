import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { createTestUser, createTripForUser, type TestUser } from './support/admin'
import { loginAs } from './support/ui'

const EVIDENCE = join(process.cwd(), 'evidence', 'tag-ui')

type Rgb = { r: number; g: number; b: number }

function parseColor(value: string): Rgb & { a: number } {
  const numbers = value.match(/[\d.]+/g)?.map(Number) ?? []
  return { r: numbers[0] ?? 0, g: numbers[1] ?? 0, b: numbers[2] ?? 0, a: numbers[3] ?? 1 }
}

function channel(value: number): number {
  const normalized = value / 255
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

function luminance(color: Rgb): number {
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
}

function contrast(first: string, second: string): number {
  const a = luminance(parseColor(first))
  const b = luminance(parseColor(second))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

async function readPill(page: Page, name: string) {
  const pill = page
    .locator('span.rounded-full')
    .filter({ hasText: new RegExp(`^${name}$`) })
    .first()
  await expect(pill).toBeVisible()
  return pill.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return { background: style.backgroundColor, color: style.color }
  })
}

async function shot(page: Page, name: string, fullPage = true): Promise<void> {
  await page.screenshot({ path: join(EVIDENCE, name), fullPage })
}

test.describe.serial('tag colour editing', () => {
  let owner: TestUser
  let tripId: string
  let settingsPath: string
  let tagName: string

  test.beforeAll(async () => {
    mkdirSync(EVIDENCE, { recursive: true })
    owner = await createTestUser('tags')
    tagName = `Sunset View ${Date.now().toString(36)}`
    tripId = await createTripForUser(owner, {
      name: 'Tag colour evidence trip',
      destination: 'Da Nang, Vietnam',
    })
    settingsPath = `/trips/${tripId}/settings`
  })

  test('creates, recolours and persists a tag in light and dark mode', async ({ page }) => {
    await loginAs(page, owner, settingsPath)
    await expect(page.getByRole('heading', { name: 'Trip settings' })).toBeVisible()

    await page.getByLabel('New tag name').fill(tagName)
    await page
      .getByRole('group', { name: 'New tag colour' })
      .getByRole('button', { name: 'Lavender' })
      .click()
    await page.getByRole('button', { name: 'Add tag' }).click()
    await expect(page.getByText(tagName, { exact: true })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Trip settings' })).toBeVisible()
    const created = await readPill(page, tagName)
    expect(parseColor(created.background).a).toBe(1)
    expect(contrast(created.background, created.color)).toBeGreaterThanOrEqual(4.5)
    await shot(page, 'tag-light-mode.png')

    await page.getByRole('button', { name: `Edit ${tagName}` }).click()
    const editPicker = page.getByRole('group', { name: 'Edit tag colour' })
    await expect(editPicker).toBeVisible()
    await expect(editPicker.getByRole('button', { name: 'Lavender' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await shot(page, 'tag-edit-mode.png')

    await editPicker.getByRole('button', { name: 'Rose' }).click()
    await expect(editPicker.getByRole('button', { name: 'Rose' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByText('Preview', { exact: true })).toBeVisible()
    await shot(page, 'tag-color-selection.png')

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Tag updated')).toBeVisible()
    await page.reload()

    const recoloured = await readPill(page, tagName)
    expect(recoloured.background).not.toBe(created.background)
    expect(contrast(recoloured.background, recoloured.color)).toBeGreaterThanOrEqual(4.5)
    await shot(page, 'tag-recoloured-light.png')

    await page.getByRole('button', { name: `Edit ${tagName}` }).click()
    const custom = page
      .getByRole('group', { name: 'Edit tag colour' })
      .getByLabel('Edit tag colour custom')
    await custom.evaluate((element) => {
      const input = element as HTMLInputElement
      input.value = '#0b1f3a'
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Tag updated')).toBeVisible()
    await page.reload()

    const customPill = await readPill(page, tagName)
    expect(contrast(customPill.background, customPill.color)).toBeGreaterThanOrEqual(4.5)
    await shot(page, 'tag-custom-color-light.png')

    await page.getByRole('button', { name: 'Switch to dark mode' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    const darkPill = await readPill(page, tagName)
    expect(contrast(darkPill.background, darkPill.color)).toBeGreaterThanOrEqual(4.5)
    await shot(page, 'tag-dark-mode.png')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    const mobilePill = await readPill(page, tagName)
    expect(contrast(mobilePill.background, mobilePill.color)).toBeGreaterThanOrEqual(4.5)
    await shot(page, 'tag-dark-mobile.png')
  })
})
